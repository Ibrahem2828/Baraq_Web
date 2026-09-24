import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { subjectIdFromValue } from "@/features/projects/components/ProjectSubjectSelect";

/**
 * Khota (study plans) and Fahes (quizzes) need a subject, and a project's
 * sources fall back to the project's. The web never sent one, so both
 * characters could not work for any web user (production 2026-09-24).
 */

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/features/projects/hooks/useProjects", () => ({
  useCreateProject: () => ({ mutate, isPending: false }),
}));
vi.mock("@/features/subjects/hooks/useSubjects", () => ({
  useSubjectsList: () => ({
    isPending: false,
    data: {
      items: [
        { id: 7, name: "علم أحياء", education_stage_name: "بكالوريا", is_active: true },
        { id: 9, name: "فيزياء", education_stage_name: "", is_active: true },
      ],
    },
  }),
}));

function renderDialog() {
  render(<CreateProjectDialog open onOpenChange={() => {}} />);
  fireEvent.change(screen.getByLabelText("projects.titleField"), { target: { value: "مشروعي" } });
}

beforeEach(() => {
  mutate.mockReset();
});

describe("project subject", () => {
  it("lists active subjects with their stage, plus an explicit no-subject option", () => {
    renderDialog();
    const select = screen.getByLabelText("projects.subject") as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "projects.subjectNone",
      "علم أحياء — بكالوريا",
      "فيزياء",
    ]);
    expect(select.value).toBe("");
  });

  it("sends the chosen subject id when creating a project", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("projects.subject"), { target: { value: "7" } });
    fireEvent.click(screen.getByText("common.confirm"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ title: "مشروعي", goal: "", subject: 7 });
  });

  it("sends null when no subject is chosen", async () => {
    renderDialog();
    fireEvent.click(screen.getByText("common.confirm"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ title: "مشروعي", goal: "", subject: null });
  });

  it("maps the form value to the API's nullable id", () => {
    expect(subjectIdFromValue("")).toBeNull();
    expect(subjectIdFromValue(undefined)).toBeNull();
    expect(subjectIdFromValue("12")).toBe(12);
  });
});

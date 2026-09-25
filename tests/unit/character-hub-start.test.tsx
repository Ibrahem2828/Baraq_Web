import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCharacter } from "@/config/characters";

/**
 * Khota could not be asked for a plan from its own hub, and every hub ignored
 * a failed start (no subject, limit reached...), leaving a button that did
 * nothing.
 */

const { mutate, push, toast, pickerScope, pickerInput, search } = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  pickerScope: { source: 42 },
  pickerInput: { value: {} as Record<string, unknown> },
  search: { value: "" },
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push }),
}));
vi.mock("@/components/feedback/Toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/api/useApiErrorMessage", () => ({ useApiErrorMessage: () => () => "حدّد مادة المشروع أولًا" }));
vi.mock("@/features/ai-jobs/hooks/useAIJob", () => ({ useCreateAIJob: () => ({ mutate, isPending: false }) }));
vi.mock("@/features/projects/ActiveProjectContext", () => ({
  useActiveProject: () => ({ projectId: "p-1", project: { public_id: "p-1", title: "علوم" } }),
}));
vi.mock("@/features/study-plans/hooks/useStudyPlans", () => ({
  useTodayPlan: () => ({ data: null }),
  useStudyPlans: () => ({ isPending: false, data: { items: [] } }),
}));
vi.mock("@/features/sources/components/SourceScopePicker", () => ({
  SourceScopePicker: ({
    open,
    onConfirm,
    initialSelection,
  }: {
    open: boolean;
    onConfirm: (scope: unknown, input: unknown) => void;
    initialSelection?: number[];
  }) =>
    open ? (
      <button data-initial={JSON.stringify(initialSelection ?? [])} onClick={() => onConfirm(pickerScope, pickerInput.value)}>
        pick-source
      </button>
    ) : null,
}));
vi.mock("@/components/brand/CharacterAvatar", () => ({ CharacterAvatar: () => null }));

beforeEach(() => {
  mutate.mockReset();
  push.mockReset();
  toast.mockReset();
  pickerInput.value = {};
  search.value = "";
});

describe("Khota hub", () => {
  async function renderHub() {
    const { KhotaHub } = await import("@/features/characters/KhotaHub");
    render(<KhotaHub character={getCharacter("khota")!} />);
  }

  it("asks Khota for a plan from the chosen source and opens the job", async () => {
    await renderHub();
    fireEvent.click(screen.getByText("khota.generate"));
    fireEvent.click(screen.getByText("pick-source"));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toEqual({ task_type: "khota_generate_plan", source: 42, input: {} });
    mutate.mock.calls[0]![1].onSuccess({ public_id: "job-1" });
    expect(push).toHaveBeenCalledWith("/ai-jobs/job-1");
  });

  it("the empty state starts a plan instead of looping to /study-plans", async () => {
    await renderHub();
    fireEvent.click(screen.getByText("khota.createFirstPlan"));
    expect(screen.getByText("pick-source")).toBeTruthy();
  });

  it("keeps the project in the today/week links", async () => {
    await renderHub();
    const hrefs = Array.from(document.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/characters/khota/today?project=p-1");
    expect(hrefs).toContain("/characters/khota/week?project=p-1");
  });

  it("says why a start was refused", async () => {
    await renderHub();
    fireEvent.click(screen.getByText("khota.generate"));
    fireEvent.click(screen.getByText("pick-source"));
    mutate.mock.calls[0]![1].onError(new Error("400"));
    expect(toast).toHaveBeenCalledWith({ title: "حدّد مادة المشروع أولًا", variant: "error" });
    expect(push).not.toHaveBeenCalled();
  });

  it("sends the learner's request with the job", async () => {
    pickerInput.value = { instructions: "خطة للوحدة الثانية فقط" };
    await renderHub();
    fireEvent.click(screen.getByText("khota.generate"));
    fireEvent.click(screen.getByText("pick-source"));
    expect(mutate.mock.calls[0]![0]).toEqual({
      task_type: "khota_generate_plan",
      source: 42,
      input: { instructions: "خطة للوحدة الثانية فقط" },
    });
  });

  it("opens with the source preselected when coming from a source's page", async () => {
    search.value = "project=p-1&source=7";
    await renderHub();
    expect(screen.getByText("pick-source").getAttribute("data-initial")).toBe("[7]");
  });
});

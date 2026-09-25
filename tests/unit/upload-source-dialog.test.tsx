import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadSourceDialog } from "@/features/sources/components/UploadSourceDialog";

/**
 * One upload dialog for the library and the project Sources tab. A source
 * uploaded from the library used to belong to no project, and the AI service
 * refuses every job without one -- so the library must ask for the project.
 */

const { mutate, projects } = vi.hoisted(() => ({
  mutate: vi.fn(),
  projects: { current: [{ public_id: "p-1", title: "علوم" }, { public_id: "p-2", title: "فيزياء" }] },
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/features/sources/hooks/useSources", () => ({
  useUploadSource: () => ({ mutate, isPending: false, progress: null, cancel: vi.fn() }),
}));
vi.mock("@/features/subscriptions/hooks/useSubscriptions", () => ({
  useMySubscription: () => ({ data: { effective_limits: { max_file_size_mb: 50 } } }),
}));
vi.mock("@/features/projects/hooks/useProjects", () => ({
  useProjects: () => ({ isPending: false, isSuccess: true, data: { items: projects.current } }),
}));
vi.mock("@/lib/api/useApiErrorMessage", () => ({ useApiErrorMessage: () => () => "error" }));

function pdf() {
  return new File([new Uint8Array(1024)], "Sci-Biology.pdf", { type: "application/pdf" });
}

function fill() {
  fireEvent.change(screen.getByLabelText("library.upload.titleField"), { target: { value: "كتاب علوم" } });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [pdf()] } });
}

beforeEach(() => {
  mutate.mockReset();
  projects.current = [{ public_id: "p-1", title: "علوم" }, { public_id: "p-2", title: "فيزياء" }];
});

describe("UploadSourceDialog", () => {
  it("from the library, refuses to upload until a project is chosen", async () => {
    render(<UploadSourceDialog open onOpenChange={() => {}} />);
    fill();
    fireEvent.click(screen.getByText("library.upload.submit"));

    await waitFor(() => expect(screen.getByText("library.upload.projectRequired")).toBeTruthy());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("from the library, sends the chosen project with the file", async () => {
    render(<UploadSourceDialog open onOpenChange={() => {}} />);
    fill();
    fireEvent.change(screen.getByLabelText("library.upload.project"), { target: { value: "p-2" } });
    fireEvent.click(screen.getByText("library.upload.submit"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const form = mutate.mock.calls[0]![0] as FormData;
    expect(form.get("project")).toBe("p-2");
    expect(form.get("title")).toBe("كتاب علوم");
    expect((form.get("file") as File).name).toBe("Sci-Biology.pdf");
  });

  it("preselects the only project a learner has", async () => {
    projects.current = [{ public_id: "only", title: "مشروعي" }];
    render(<UploadSourceDialog open onOpenChange={() => {}} />);
    fill();
    fireEvent.click(screen.getByText("library.upload.submit"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect((mutate.mock.calls[0]![0] as FormData).get("project")).toBe("only");
  });

  it("inside a project, uses that project without asking", async () => {
    render(<UploadSourceDialog open onOpenChange={() => {}} projectId="p-9" />);
    expect(screen.queryByLabelText("library.upload.project")).toBeNull();
    fill();
    fireEvent.click(screen.getByText("library.upload.submit"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect((mutate.mock.calls[0]![0] as FormData).get("project")).toBe("p-9");
  });

  it("tells a learner with no project to create one first", () => {
    projects.current = [];
    render(<UploadSourceDialog open onOpenChange={() => {}} />);
    expect(screen.getByText("library.upload.noProjects")).toBeTruthy();
  });
});

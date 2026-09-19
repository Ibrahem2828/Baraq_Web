import { Suspense } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SourceDetailPage from "@/app/[locale]/(app)/library/[id]/page";
import type { SourceStatus, StudentSource } from "@/types/domain";

/**
 * Guards the P0-A production bug.
 *
 * The page used to gate character actions on `status === "ready"`. Django
 * leaves every non-text source at `uploaded` on purpose — that is the
 * terminal success state, extraction belongs to the AI service — so a PDF
 * was blocked forever behind a "process" button that only rewrote
 * `uploaded`. Readiness now comes from the capabilities contract.
 */

const { useSource, useSourceCapabilities, processMutate } = vi.hoisted(() => ({
  useSource: vi.fn(),
  useSourceCapabilities: vi.fn(),
  processMutate: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({ useMutation: () => ({ mutate: vi.fn() }) }));
vi.mock("@/features/sources/hooks/useSources", () => ({
  useSource,
  useSourceCapabilities,
  useProcessSource: () => ({ mutate: processMutate, isPending: false }),
}));

function sourceWith(status: SourceStatus, sourceType = "pdf"): StudentSource {
  return {
    id: 42,
    title: "Chapter 3",
    source_type: sourceType,
    status,
    extracted_text_preview: "",
  } as unknown as StudentSource;
}

/** Every character available, as the backend reports for a usable source. */
const ALL_AVAILABLE = Object.fromEntries(
  ["khota", "fahes", "rasheed", "kholasa", "sada"].map((key) => [
    key,
    { available: true, actions: ["x"], message: "ok" },
  ]),
);

/** Nothing available, as the backend now reports for a failed source. */
const NONE_AVAILABLE = Object.fromEntries(
  ["khota", "fahes", "rasheed", "kholasa", "sada"].map((key) => [
    key,
    { available: false, actions: [], message: "source not usable" },
  ]),
);

/** `use(params)` suspends on first render; flush the microtask inside act()
 *  so React resumes before assertions run. */
async function renderPage() {
  const params = Promise.resolve({ id: "42" });
  await act(async () => {
    render(
      <Suspense fallback={<div>suspended</div>}>
        <SourceDetailPage params={params} />
      </Suspense>,
    );
    await params;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("source detail readiness", () => {
  it("offers characters for an uploaded (non-text) source", async () => {
    useSource.mockReturnValue({ isPending: false, isError: false, data: sourceWith("uploaded") });
    useSourceCapabilities.mockReturnValue({
      isPending: false,
      isError: false,
      data: ALL_AVAILABLE,
    });

    await renderPage();

    // This is the assertion that fails before the fix: the page rendered a
    // "still processing" empty state instead of the character actions.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "characters.fahes.name" })).toBeInTheDocument();
    });
    expect(screen.queryByText("library.detail.processingFailedTitle")).not.toBeInTheDocument();
  });

  it("does not offer a processing retry for an uploaded source", async () => {
    useSource.mockReturnValue({ isPending: false, isError: false, data: sourceWith("uploaded") });
    useSourceCapabilities.mockReturnValue({
      isPending: false,
      isError: false,
      data: ALL_AVAILABLE,
    });

    await renderPage();

    await waitFor(() =>
      expect(screen.getByText("library.detail.extractedText")).toBeInTheDocument(),
    );
    // Re-processing an `uploaded` source only re-stamps sha256/processed_at.
    expect(
      screen.queryByRole("button", { name: "library.detail.retryProcessing" }),
    ).not.toBeInTheDocument();
  });

  it("explains that non-text sources are extracted by the AI at job time", async () => {
    useSource.mockReturnValue({ isPending: false, isError: false, data: sourceWith("uploaded") });
    useSourceCapabilities.mockReturnValue({
      isPending: false,
      isError: false,
      data: ALL_AVAILABLE,
    });

    await renderPage();

    await waitFor(() =>
      expect(screen.getByText("library.detail.extractedByAi")).toBeInTheDocument(),
    );
  });

  it("shows the failure state and a retry for a failed source", async () => {
    useSource.mockReturnValue({ isPending: false, isError: false, data: sourceWith("failed") });
    useSourceCapabilities.mockReturnValue({
      isPending: false,
      isError: false,
      data: NONE_AVAILABLE,
    });

    await renderPage();

    await waitFor(() =>
      expect(screen.getByText("library.detail.processingFailedTitle")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "library.detail.retryProcessing" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "characters.fahes.name" })).not.toBeInTheDocument();
  });

  it("withholds a character the backend reports as unavailable, with its reason", async () => {
    useSource.mockReturnValue({ isPending: false, isError: false, data: sourceWith("uploaded") });
    useSourceCapabilities.mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...ALL_AVAILABLE, fahes: { available: false, actions: [], message: "plan limit" } },
    });

    await renderPage();

    await waitFor(() => expect(screen.getByText("plan limit")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "characters.fahes.name" })).not.toBeInTheDocument();
  });
});

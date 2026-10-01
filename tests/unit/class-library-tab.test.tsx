import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassLibraryItem } from "@/features/class-library/api/classLibraryApi";

/**
 * Classroom Shared Library tab: what the school shared, grouped by class,
 * sent to a character in one tap, never re-uploaded.
 */

const mutate = vi.fn();
let items: ClassLibraryItem[] = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
// Motion needs matchMedia, which jsdom lacks (as in the login tests).
vi.mock("@/components/motion/FadeIn", () => ({
  StaggerIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StaggerItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/api/useApiErrorMessage", () => ({ useApiErrorMessage: () => () => "error" }));
vi.mock("@/features/class-library/hooks/useClassLibrary", () => ({
  useClassLibrary: () => ({ isPending: false, isError: false, data: { items, count: items.length } }),
  useSendLibraryItem: () => ({ mutate, isPending: false, isError: false, variables: undefined }),
}));

function item(overrides: Partial<ClassLibraryItem>): ClassLibraryItem {
  return {
    public_id: "11111111-1111-1111-1111-111111111111",
    organization: "org-1",
    organization_name: "مدرسة النور",
    classroom: "class-1",
    classroom_name: "العاشر - أ",
    subject: 3,
    subject_name: "الفيزياء",
    title: "ملزمة الوحدة الثانية",
    description: "",
    category: "handout",
    original_filename: "unit2.pdf",
    file_size: 2 * 1024 * 1024,
    extension: ".pdf",
    source_type: "pdf",
    status: "active",
    uploaded_by_name: "أ. سارة",
    characters: ["fahes", "kholasa", "khota"],
    created_at: "2026-10-02T09:00:00Z",
    updated_at: "2026-10-02T09:00:00Z",
    ...overrides,
  };
}

describe("ClassLibraryTab", () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it("groups files by class and sends one to a character in one tap", async () => {
    items = [
      item({}),
      item({
        public_id: "22222222-2222-2222-2222-222222222222",
        classroom: null,
        classroom_name: null,
        title: "تسجيل مراجعة",
        category: "recording",
        source_type: "audio",
        characters: ["sada"],
      }),
    ];
    const { ClassLibraryTab } = await import("@/features/class-library/components/ClassLibraryTab");
    render(<ClassLibraryTab />);

    expect(screen.getByText("مدرسة النور — العاشر - أ")).toBeTruthy();
    expect(screen.getByText("مدرسة النور — classLibrary.wholeOrganization")).toBeTruthy();
    expect(screen.getByText("ملزمة الوحدة الثانية")).toBeTruthy();
    // Documents offer the reading characters, the recording only Sada.
    expect(screen.getAllByRole("button", { name: "characters.fahes.name" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "characters.sada.name" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "characters.kholasa.name" }));
    expect(mutate).toHaveBeenCalledWith({ id: "11111111-1111-1111-1111-111111111111", character: "kholasa" });

    const downloads = screen.getAllByRole("link", { name: /classLibrary.download/ });
    expect(downloads[0].getAttribute("href")).toBe(
      "/api/bff/class-library/11111111-1111-1111-1111-111111111111/download/",
    );
  });

  it("tells a learner without a school how to join one", async () => {
    items = [];
    const { ClassLibraryTab } = await import("@/features/class-library/components/ClassLibraryTab");
    render(<ClassLibraryTab />);

    expect(screen.getByText("classLibrary.emptyTitle")).toBeTruthy();
    expect(screen.getByRole("link", { name: /classLibrary.joinAction/ }).getAttribute("href")).toBe("/join");
  });
});

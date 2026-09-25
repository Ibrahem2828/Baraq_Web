import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StudentRecommendation } from "@/types/domain";

/**
 * Rasheed's recommendations are objects (title, action, reason, priority,
 * success measure); the page rendered each one with JSON.stringify.
 */

const recommendation: StudentRecommendation = {
  id: 1,
  project: "p-1",
  subject: null,
  title: "توصيات رشيد",
  summary: "سجّلت ٦٠٪ في موضوع القوة من ثلاث محاولات.",
  overall_score: null,
  strengths: ["الحركة"],
  weaknesses: ["القوة"],
  recommendations: [
    {
      title: "راجع قوانين نيوتن الثلاثة",
      action: "حلّ ١٠ أسئلة من فاحص على القوة ثم راجع أخطاءك.",
      reason: "درجة القوة ٦٠٪ مقابل ٩٠٪ في الحركة.",
      priority: "now",
      success_measure: "٧٥٪ أو أكثر في الاختبار التالي.",
      related_topics: ["القوة"],
    },
  ],
  next_best_action: { label: "ابدأ باختبار القوة الآن.", confidence_note: "الثقة متوسطة." },
  source_metrics: {},
  is_read: true,
  created_at: "2026-09-26T10:00:00Z",
  updated_at: "2026-09-26T10:00:00Z",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
vi.mock("@/features/results/hooks/useResults", () => ({
  useRecommendation: () => ({ isPending: false, isError: false, data: recommendation }),
  useMarkRecommendationRead: () => ({ isPending: false, mutate: vi.fn() }),
}));
vi.mock("@/features/results/components/RelatedArtifactLinks", () => ({ OpenProjectLink: () => null }));

describe("Rasheed's recommendation page", () => {
  it("renders each recommendation as a structured card, never as JSON", async () => {
    const { default: Page } = await import("@/app/[locale]/(app)/recommendations/[id]/page");
    // `use(params)` suspends on first render: flush it inside act().
    const params = Promise.resolve({ id: "1" });
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <Suspense fallback={<div>suspended</div>}>
          <Page params={params} />
        </Suspense>,
      ));
      await params;
    });

    expect(await screen.findByRole("heading", { name: /راجع قوانين نيوتن الثلاثة/ })).toBeTruthy();
    expect(screen.getByText("حلّ ١٠ أسئلة من فاحص على القوة ثم راجع أخطاءك.")).toBeTruthy();
    expect(screen.getByText("٧٥٪ أو أكثر في الاختبار التالي.")).toBeTruthy();
    expect(screen.getByText("recommendations.priority.now")).toBeTruthy();
    expect(screen.getByText("ابدأ باختبار القوة الآن.")).toBeTruthy();
    // No score yet: an explanation, not "0".
    expect(screen.getByText("recommendations.noScore")).toBeTruthy();
    expect(container.textContent).not.toContain('{"title"');
    expect(container.textContent).not.toContain("success_measure");
  });
});

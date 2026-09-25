import { describe, expect, it } from "vitest";
import { EMPTY_AI_REQUEST, toAIRequestInput } from "@/features/ai-jobs/components/AIRequestFields";
import { parseStructuredText } from "@/components/content/StructuredText";

describe("the learner's request becomes the job input", () => {
  it("sends only what applies to the character", () => {
    const draft = {
      ...EMPTY_AI_REQUEST,
      instructions: "  ركّز على الوحدة الثانية  ",
      difficulty: "hard" as const,
    };
    expect(toAIRequestInput(draft, { character: "fahes", quizOptions: true })).toEqual({
      instructions: "ركّز على الوحدة الثانية",
      question_count: 10,
      difficulty: "hard",
    });
    expect(toAIRequestInput(draft, { character: "khota" })).toEqual({
      instructions: "ركّز على الوحدة الثانية",
    });
    expect(
      toAIRequestInput(
        { ...EMPTY_AI_REQUEST, summaryLength: "short" },
        { character: "kholasa", summaryLength: true },
      ),
    ).toEqual({ summary_length: "short" });
  });

  it("sends no instructions for an empty box", () => {
    expect(
      toAIRequestInput({ ...EMPTY_AI_REQUEST, instructions: "   " }, { character: "rasheed" }),
    ).toEqual({});
  });
});

describe("structured AI text", () => {
  it("turns ## headings and - points into sections", () => {
    const text = [
      "## الجهاز العصبي",
      "يتكون من:",
      "- الدماغ",
      "- النخاع الشوكي",
      "",
      "## السيالة العصبية",
      "تنتقل عبر المشابك.",
    ].join("\n");
    expect(parseStructuredText(text)).toEqual([
      { kind: "heading", level: 2, text: "الجهاز العصبي" },
      { kind: "paragraph", text: "يتكون من:" },
      { kind: "list", items: ["الدماغ", "النخاع الشوكي"] },
      { kind: "heading", level: 2, text: "السيالة العصبية" },
      { kind: "paragraph", text: "تنتقل عبر المشابك." },
    ]);
  });

  it("keeps plain older summaries as paragraphs", () => {
    expect(parseStructuredText(["سطر أول", "سطر ثانٍ"].join("\n"))).toEqual([
      { kind: "paragraph", text: "سطر أول سطر ثانٍ" },
    ]);
  });
});

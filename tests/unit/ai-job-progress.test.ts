import { describe, expect, it } from "vitest";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import type { AIJobProgressStage } from "@/types/domain";

/**
 * Progress contract guard.
 *
 * The job page rendered a hardcoded percentage per status — 25% for
 * `submitted`, 50% for `processing` — which was decoration, not information:
 * Django only learned anything when the AI service delivered its completion
 * webhook, so a job sat on one number for its entire run. Progress is now a
 * stage the backend reports, and there is no percentage to invent.
 */

/** Mirrors ProgressStage in apps/ai_integration/services.py. */
const BACKEND_STAGES: AIJobProgressStage[] = [
  "queued",
  "preparing",
  "retrieving",
  "generating",
  "validating",
  "finalizing",
  "completed",
  "failed",
  "canceled",
];

const CHARACTERS = ["fahes", "kholasa", "sada", "khota", "rasheed"];

function lookup(messages: unknown, path: string[]): unknown {
  return path.reduce<unknown>(
    (node, part) =>
      node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
    messages,
  );
}

describe("AI job progress stages", () => {
  it.each(BACKEND_STAGES)("%s has generic copy in both locales", (stage) => {
    for (const [locale, messages] of [
      ["ar", arMessages],
      ["en", enMessages],
    ] as const) {
      const value = lookup(messages, ["aiJobs", "stage", stage]);
      expect(typeof value, `${stage} missing in ${locale}`).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it.each(CHARACTERS)("%s has character-specific copy for its working stages", (character) => {
    for (const messages of [arMessages, enMessages]) {
      const specific = lookup(messages, ["aiJobs", "stage", character]);
      expect(specific, `${character} has no stage copy`).toBeTruthy();
      // Each character describes at least what it is generating, in its own
      // terms — "transcribing the audio" is not "generating".
      expect(Object.keys(specific as object).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("character-specific stages are all real backend stages", () => {
    for (const character of CHARACTERS) {
      const specific = lookup(arMessages, ["aiJobs", "stage", character]) as Record<string, string>;
      for (const stage of Object.keys(specific)) {
        expect(BACKEND_STAGES).toContain(stage as AIJobProgressStage);
      }
    }
  });

  it("publishes no percentage table for the UI to invent progress from", () => {
    // The regression: a Record<status, number> in the job page that had no
    // relationship to what the pipeline was doing.
    const messages = lookup(arMessages, ["aiJobs", "stage"]) as Record<string, unknown>;
    for (const value of Object.values(messages)) {
      expect(typeof value === "number").toBe(false);
    }
  });
});

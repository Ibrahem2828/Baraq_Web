import { describe, expect, it } from "vitest";
import { getAIJobPollingDelay } from "@/config/constants";

describe("getAIJobPollingDelay", () => {
  it("polls fastest for a just-created job", () => {
    expect(getAIJobPollingDelay(new Date())).toBe(2_000);
  });

  it("backs off as the job ages", () => {
    expect(getAIJobPollingDelay(new Date(Date.now() - 30_000))).toBe(3_000);
    expect(getAIJobPollingDelay(new Date(Date.now() - 90_000))).toBe(5_000);
  });

  it("falls back to the slowest interval once past all tiers", () => {
    expect(getAIJobPollingDelay(new Date(Date.now() - 10 * 60_000))).toBe(10_000);
  });
});

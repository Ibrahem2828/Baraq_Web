import { describe, expect, it } from "vitest";
import { getAIJobPollingDelay, getAIJobPollingInterval } from "@/config/constants";

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

describe("getAIJobPollingInterval", () => {
  it.each(["completed", "failed", "canceled"])("stops polling for %s jobs", (status) => {
    expect(getAIJobPollingInterval({ status, created_at: new Date().toISOString() })).toBe(false);
  });

  it("keeps an active job on the bounded backoff schedule", () => {
    expect(
      getAIJobPollingInterval({ status: "processing", created_at: new Date().toISOString() }),
    ).toBe(2_000);
  });

  it("does not poll before a job has loaded", () => {
    expect(getAIJobPollingInterval(undefined)).toBe(false);
  });
});

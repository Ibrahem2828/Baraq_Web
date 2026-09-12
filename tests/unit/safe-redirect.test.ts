import { describe, expect, it } from "vitest";
import { isSafeRedirectPath } from "@/lib/utils/safe-redirect";

describe("isSafeRedirectPath", () => {
  it("accepts a plain same-origin path", () => {
    expect(isSafeRedirectPath("/ar/library")).toBe(true);
    expect(isSafeRedirectPath("/en/study-plans?tab=active")).toBe(true);
  });

  it("rejects protocol-relative URLs (the open-redirect bypass this exists for)", () => {
    expect(isSafeRedirectPath("//evil.com")).toBe(false);
    expect(isSafeRedirectPath("//evil.com/ar/library")).toBe(false);
  });

  it("rejects backslash variants some browsers still treat as protocol-relative", () => {
    expect(isSafeRedirectPath("/\\evil.com")).toBe(false);
  });

  it("rejects absolute URLs with any scheme", () => {
    expect(isSafeRedirectPath("https://evil.com")).toBe(false);
    expect(isSafeRedirectPath("javascript://evil.com")).toBe(false);
  });

  it("rejects empty, null, and non-rooted values", () => {
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
    expect(isSafeRedirectPath("")).toBe(false);
    expect(isSafeRedirectPath("ar/library")).toBe(false);
  });
});

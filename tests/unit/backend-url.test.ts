import { describe, expect, it } from "vitest";
import { backendUrl } from "@/lib/api/backend";

describe("backendUrl", () => {
  it("normalizes slashes and adds exactly one Django trailing slash", () => {
    expect(backendUrl("///subjects///")).toBe("http://localhost:8000/api/v1/subjects/");
    expect(backendUrl("projects/42")).toBe("http://localhost:8000/api/v1/projects/42/");
    expect(backendUrl("/")).toBe("http://localhost:8000/api/v1/");
    expect(backendUrl("//evil.example/path")).toBe(
      "http://localhost:8000/api/v1/evil.example/path/",
    );
  });

  it("preserves an existing encoded query without re-encoding it", () => {
    expect(backendUrl("/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2")).toBe(
      "http://localhost:8000/api/v1/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2",
    );
  });

  it.each([
    "https://evil.example/path",
    "/../admin",
    "/%2e%2e/admin",
    "/safe%2fescape",
    "/safe\\escape",
    "/path#fragment",
    "/bad%encoding",
  ])("rejects unsafe or externally-routable path %s", (path) => {
    expect(() => backendUrl(path)).toThrow("Invalid backend path");
  });
});

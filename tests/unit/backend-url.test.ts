import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  BackendResponseError,
  backendFetch,
  backendUrl,
  classifyBackendError,
} from "@/lib/api/backend";

// serverEnv parses BACKEND_API_URL once, at import. tests/setup.ts only fills
// it in when unset, so CI's real origin (or a developer's .env.local) would
// leak into the exact-URL assertions below. Pin it before the module loads.
const pinnedEnv = vi.hoisted(() => {
  const previous = process.env.BACKEND_API_URL;
  process.env.BACKEND_API_URL = "http://localhost:8000";
  return { previous };
});

afterAll(() => {
  if (pinnedEnv.previous === undefined) delete process.env.BACKEND_API_URL;
  else process.env.BACKEND_API_URL = pinnedEnv.previous;
});

describe("backendUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes slashes and adds exactly one Django trailing slash", () => {
    expect(backendUrl("///subjects///")).toBe("http://localhost:8000/api/v1/subjects/");
    expect(backendUrl("projects/42")).toBe("http://localhost:8000/api/v1/projects/42/");
    expect(backendUrl("/")).toBe("http://localhost:8000/api/v1/");
  });

  it("preserves an existing encoded query without re-encoding it", () => {
    expect(backendUrl("/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2")).toBe(
      "http://localhost:8000/api/v1/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/../admin",
    "/%2e%2e/admin",
    "/safe%2fescape",
    "/safe\\escape",
    "/path#fragment",
    "/bad%encoding",
  ])("rejects unsafe or externally-routable path %s", (path) => {
    expect(() => backendUrl(path)).toThrow("Invalid backend path");
  });

  it("sends the canonical slash-terminated URL without following redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    await backendFetch("/subjects?stage=1", {
      headers: { "X-Request-ID": "backend-url-test" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/subjects/?stage=1",
      expect.objectContaining({
        cache: "no-store",
        redirect: "manual",
        headers: expect.any(Headers),
      }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-request-id")).toBe("backend-url-test");
  });

  it("classifies nested Node connection and timeout errors accurately", () => {
    const connectionError = new TypeError("fetch failed", {
      cause: new AggregateError([
        Object.assign(new Error("connect refused"), { code: "ECONNREFUSED" }),
      ]),
    });
    const timeoutError = new TypeError("fetch failed", {
      cause: Object.assign(new Error("connect timed out"), {
        code: "UND_ERR_CONNECT_TIMEOUT",
      }),
    });

    expect(classifyBackendError(connectionError)).toEqual({
      status: 502,
      code: "upstream_unreachable",
    });
    expect(classifyBackendError(timeoutError)).toEqual({
      status: 504,
      code: "upstream_timeout",
    });
    expect(classifyBackendError(new BackendResponseError(503))).toEqual({
      status: 503,
      code: "upstream_response_error",
    });
  });
});

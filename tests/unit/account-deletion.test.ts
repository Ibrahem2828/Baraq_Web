import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { backendFetch, clearAuthCookies, logBackendFailure } = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  clearAuthCookies: vi.fn(),
  logBackendFailure: vi.fn().mockReturnValue({ status: 502, code: "upstream_error" }),
}));

vi.mock("@/lib/api/backend", () => ({ backendFetch, logBackendFailure }));
vi.mock("@/lib/auth/server", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-access-token"),
  refreshAccessToken: vi.fn(),
  clearAuthCookies,
  validateMutationCsrf: vi.fn().mockResolvedValue(true),
}));

describe("account deletion through the BFF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards DELETE /users/me/ and clears HttpOnly auth cookies on success", async () => {
    backendFetch.mockResolvedValue(Response.json({ success: true, data: { message: "deleted" } }));
    const { DELETE } = await import("@/app/api/bff/[...path]/route");
    const request = new NextRequest("https://web.baraqapp.com/api/bff/users/me", {
      method: "DELETE",
      headers: { origin: "https://web.baraqapp.com", host: "web.baraqapp.com" },
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ path: ["users", "me"] }),
    });

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      "/users/me/",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.any(Headers),
      }),
    );
    expect(clearAuthCookies).toHaveBeenCalledOnce();
  });
});

describe("generic BFF transport contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes the Django slash, preserves query encoding, and forwards safe correlation headers", async () => {
    backendFetch.mockResolvedValue(Response.json({ success: true, data: [] }));
    const { GET } = await import("@/app/api/bff/[...path]/route");
    const request = new NextRequest(
      "https://web.baraqapp.com/api/bff/subjects?page=2&search=%D8%B9%D9%84%D9%88%D9%85",
      {
        headers: { "X-Request-ID": "request-123", "Accept-Language": "ar" },
      },
    );

    const response = await GET(request, { params: Promise.resolve({ path: ["subjects"] }) });
    const [, init] = backendFetch.mock.calls[0] as [string, { headers: Headers }];

    expect(response.status).toBe(200);
    expect(backendFetch.mock.calls[0]?.[0]).toBe(
      "/subjects/?page=2&search=%D8%B9%D9%84%D9%88%D9%85",
    );
    expect(init.headers.get("x-request-id")).toBe("request-123");
    expect(init.headers.get("accept-language")).toBe("ar");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("turns an unexpected Django redirect into a JSON gateway error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    backendFetch.mockResolvedValue(
      new Response(null, { status: 301, headers: { location: "/api/v1/subjects/" } }),
    );
    const { GET } = await import("@/app/api/bff/[...path]/route");
    const request = new NextRequest("https://web.baraqapp.com/api/bff/subjects");

    const response = await GET(request, { params: Promise.resolve({ path: ["subjects"] }) });

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toMatchObject({ success: false, code: "upstream_redirect" });
  });

  it("returns a safe gateway error when Django is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    backendFetch.mockRejectedValue(new Error("network unavailable"));
    const { GET } = await import("@/app/api/bff/[...path]/route");
    const request = new NextRequest("https://web.baraqapp.com/api/bff/subjects");

    const response = await GET(request, { params: Promise.resolve({ path: ["subjects"] }) });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ success: false, code: "upstream_error" });
  });
});

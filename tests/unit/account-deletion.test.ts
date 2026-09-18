import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { backendFetch, clearAuthCookies, logBackendFailure } = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  clearAuthCookies: vi.fn(),
  logBackendFailure: vi.fn().mockReturnValue({ status: 502, code: "upstream_error" }),
}));

vi.mock("@/lib/api/backend", () => ({
  backendFetch,
  backendUrl: (path: string) => {
    if (path.includes("https:") || path.includes("..")) throw new Error("Invalid backend path");
    return `http://backend:8000/api/v1${path}`;
  },
  logBackendFailure,
}));
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

  it.each(["POST", "PUT", "PATCH"] as const)(
    "preserves the exact JSON body and content type for %s",
    async (method) => {
      const payload = {
        email: "visible.student@example.com",
        full_name: "Visible Student",
        password: "NotAProductionSecret123!",
      };
      backendFetch.mockResolvedValue(
        Response.json({ success: true, data: { email: payload.email } }, { status: 201 }),
      );
      const handlers = await import("@/app/api/bff/[...path]/route");
      const request = new NextRequest("https://web.baraqapp.com/api/bff/auth/register", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "test-csrf",
        },
        body: JSON.stringify(payload),
      });

      const response = await handlers[method](request, {
        params: Promise.resolve({ path: ["auth", "register"] }),
      });
      const [targetPath, init] = backendFetch.mock.calls.at(-1) as [
        string,
        { method: string; headers: Headers; body: ArrayBuffer },
      ];

      expect(response.status).toBe(201);
      expect(targetPath).toBe("/auth/register/");
      expect(init.method).toBe(method);
      expect(init.headers.get("content-type")).toBe("application/json");
      expect(JSON.parse(new TextDecoder().decode(init.body))).toEqual(payload);
    },
  );

  it("forwards multipart uploads byte-for-byte without rebuilding the incoming boundary", async () => {
    backendFetch.mockResolvedValue(Response.json({ success: true }, { status: 201 }));
    const { POST } = await import("@/app/api/bff/[...path]/route");
    const boundary = "----browser-generated-boundary";
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="title"',
      "",
      "درس",
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="lesson.txt"',
      "Content-Type: text/plain",
      "",
      "source-content",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    const request = new NextRequest("https://web.baraqapp.com/api/bff/student-sources", {
      method: "POST",
      headers: {
        "X-CSRF-Token": "test-csrf",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["student-sources"] }),
    });
    const [, init] = backendFetch.mock.calls.at(-1) as [
      string,
      { headers: Headers; body: ArrayBuffer },
    ];
    const raw = new TextDecoder().decode(init.body);

    expect(response.status).toBe(201);
    expect(init.headers.get("content-type")).toBe(`multipart/form-data; boundary=${boundary}`);
    expect(raw).toBe(multipartBody);
    expect(raw).toContain("lesson.txt");
    expect(raw).toContain("source-content");
  });

  it("rejects an externally-routable catch-all path before calling the backend", async () => {
    const { GET } = await import("@/app/api/bff/[...path]/route");
    const request = new NextRequest("https://web.baraqapp.com/api/bff/https:/evil.example/path");

    const response = await GET(request, {
      params: Promise.resolve({ path: ["https:", "evil.example", "path"] }),
    });

    expect(response.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
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

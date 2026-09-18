// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startCaptureServer, type CaptureServer } from "./capture-server";

let capture: CaptureServer;

const cookieJar = vi.hoisted(() => new Map<string, { value: string }>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

beforeAll(async () => {
  capture = await startCaptureServer();
  // src/config/env.ts is Zod-validated at import and forbids a trailing
  // slash; backendUrl() appends /api/v1 itself.
  process.env.BACKEND_API_URL = capture.backendApiUrl.replace(/\/api\/v1$/, "");
  process.env.APP_ENV = "production";
});

afterAll(async () => {
  await capture.close();
});

beforeEach(() => {
  capture.requests.length = 0;
  cookieJar.clear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Stand-in for Next.js's instrumented `globalThis.fetch` in a server build.
 * It rebuilds the outgoing request from the arguments it is handed; a body
 * that is a one-shot stream has no value to carry across that rebuild, so it
 * is lost. A string or ArrayBuffer body copies through intact.
 *
 * This is the harness that exposed the Dashboard's bodiless login POST. Web's
 * transport is held to the same standard here rather than assumed safe.
 */
function installNextStyleFetchPatch() {
  const native = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input instanceof Request) {
        return native(
          new Request(input.url, {
            method: input.method,
            headers: input.headers,
            body: typeof init?.body === "string" ? init.body : undefined,
            redirect: input.redirect,
          }),
        );
      }
      return native(input, init);
    }),
  );
}

describe("Web auth transport — what reaches the socket", () => {
  it.each([
    ["plain global fetch", () => undefined],
    ["a Next.js-style patched global fetch", installNextStyleFetchPatch],
  ])("login puts the credentials on the wire under %s", async (_label, patch) => {
    patch();
    const { login } = await import("@/lib/auth/server");
    capture.reply(401, {
      success: false,
      message: "Invalid credentials",
      code: "authentication_error",
    });

    const result = await login("nobody@example.com", "NotARealPassword123!", "wire-test");

    expect(capture.requests).toHaveLength(1);
    const upstream = capture.requests[0]!;
    expect(upstream.rawBody.byteLength).toBeGreaterThan(0);
    expect(JSON.parse(upstream.text)).toEqual({
      email: "nobody@example.com",
      password: "NotARealPassword123!",
    });
    expect(upstream.method).toBe("POST");
    expect(upstream.url).toBe("/api/v1/auth/login/");
    expect(String(upstream.headers["content-type"])).toContain("application/json");
    expect(upstream.headers["x-forwarded-proto"]).toBe("https");
    expect(upstream.headers["x-request-id"]).toBe("wire-test");

    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("refresh puts the refresh token on the wire", async () => {
    installNextStyleFetchPatch();
    const { refreshAccessToken } = await import("@/lib/auth/server");
    cookieJar.set("baraq_refresh", { value: "opaque-refresh" });
    capture.reply(200, { data: { access: "new-access", refresh: "new-refresh" } });

    await expect(refreshAccessToken()).resolves.toBe("new-access");

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/refresh/");
    expect(JSON.parse(upstream.text)).toEqual({ refresh: "opaque-refresh" });
  });

  it("verify-email puts the OTP on the wire", async () => {
    installNextStyleFetchPatch();
    const { verifyEmail } = await import("@/lib/auth/server");
    capture.reply(200, {
      data: { access: "a", refresh: "r", user: { id: 1 } },
    });

    await verifyEmail("student@example.com", "123456", null);

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/verify-email/");
    expect(JSON.parse(upstream.text)).toEqual({
      email: "student@example.com",
      code: "123456",
    });
  });
});

describe("Web BFF — proxied bodies on the socket", () => {
  async function bffPost(path: string[], body: BodyInit, contentType?: string) {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/bff/[...path]/route");
    const headers: Record<string, string> = {
      origin: "https://web.baraqapp.com",
      host: "web.baraqapp.com",
      "x-csrf-token": "csrf-token",
    };
    if (contentType) headers["content-type"] = contentType;
    cookieJar.set("baraq_csrf", { value: "csrf-token" });
    cookieJar.set("baraq_access", { value: "access-token" });

    return POST(
      new NextRequest(`https://web.baraqapp.com/api/bff/${path.join("/")}`, {
        method: "POST",
        headers,
        body,
      }),
      { params: Promise.resolve({ path }) },
    );
  }

  it("forwards a JSON registration body byte-for-byte", async () => {
    installNextStyleFetchPatch();
    const payload = {
      email: "new.student@example.com",
      full_name: "New Student",
      password: "NotAProductionSecret123!",
    };
    capture.reply(201, { success: true, data: { email: payload.email } });

    const response = await bffPost(
      ["auth", "register"],
      JSON.stringify(payload),
      "application/json",
    );

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/register/");
    expect(JSON.parse(upstream.text)).toEqual(payload);
    expect(response.status).toBe(201);
  });

  it("forwards a multipart upload without rebuilding the browser's boundary", async () => {
    installNextStyleFetchPatch();
    const form = new FormData();
    form.set("title", "ملف");
    form.set("file", new File(["source-content"], "lesson.txt", { type: "text/plain" }));
    const encoded = await new Response(form).arrayBuffer();
    const boundaryType = new Response(form).headers.get("content-type")!;
    capture.reply(201, { success: true });

    await bffPost(["student-sources"], encoded, boundaryType);

    const upstream = capture.requests[0]!;
    expect(String(upstream.headers["content-type"])).toBe(boundaryType);
    expect(upstream.text).toContain("lesson.txt");
    expect(upstream.text).toContain("source-content");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.getCookie,
    set: mocks.setCookie,
    delete: mocks.deleteCookie,
  })),
}));
vi.mock("@/lib/api/backend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/backend")>()),
  backendFetch: mocks.backendFetch,
  logBackendFailure: vi.fn(() => ({ status: 502, code: "upstream_error" })),
}));

import { clearAuthCookies, refreshAccessToken } from "./server";

describe("Web refresh transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCookie.mockImplementation((name: string) =>
      name === "baraq_refresh" ? { value: "opaque-refresh" } : undefined,
    );
  });

  it("forwards the refresh JSON exactly and rotates HttpOnly token cookies", async () => {
    mocks.backendFetch.mockResolvedValue(
      Response.json({ data: { access: "new-access", refresh: "new-refresh" } }),
    );

    await expect(refreshAccessToken()).resolves.toBe("new-access");
    expect(mocks.backendFetch).toHaveBeenCalledWith(
      "/auth/refresh/",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: "opaque-refresh" }),
      }),
    );
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "baraq_access",
      "new-access",
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "baraq_refresh",
      "new-refresh",
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
  });

  it("does not clear a valid local session on a temporary upstream 5xx", async () => {
    mocks.backendFetch.mockResolvedValue(Response.json({ success: false }, { status: 503 }));

    await expect(refreshAccessToken()).rejects.toMatchObject({ upstreamStatus: 503 });
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
  });
});

describe("clearAuthCookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCookie.mockReturnValue(undefined);
  });

  it("expires every auth cookie with the same attributes they were written with", async () => {
    await clearAuthCookies();

    // A cookie is identified by (name, domain, path). Expiring it with a
    // different domain/path writes a *different* cookie and silently leaves
    // the real one in the browser — so an AUTH_COOKIE_DOMAIN deployment would
    // keep a live refresh token after logout.
    const names = mocks.setCookie.mock.calls.map((call) => call[0] as string);
    expect(names).toEqual(
      expect.arrayContaining(["baraq_access", "baraq_refresh", "baraq_csrf"]),
    );
    for (const [, value, options] of mocks.setCookie.mock.calls) {
      expect(value).toBe("");
      expect(options).toMatchObject({ path: "/", maxAge: 0, sameSite: "lax" });
      expect(options).toHaveProperty("domain");
    }
  });

  it("does not leave a reusable CSRF token behind after sign-out", async () => {
    await clearAuthCookies();

    const csrf = mocks.setCookie.mock.calls.find((call) => call[0] === "baraq_csrf");
    expect(csrf?.[1]).toBe("");
    expect(csrf?.[2]).toMatchObject({ httpOnly: false, maxAge: 0 });
  });
});

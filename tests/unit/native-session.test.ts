import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Keystore/Keychain plugin.
const stored = vi.hoisted(() => new Map<string, string>());
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    setKeyPrefix: vi.fn(async () => undefined),
    getItem: vi.fn(async (key: string) => stored.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => void stored.set(key, value)),
    removeItem: vi.fn(async (key: string) => void stored.delete(key)),
  },
}));

import {
  SessionUnavailableError,
  apiUrl,
  clearTokens,
  getAccessToken,
  hasSession,
  onSessionEnded,
  refreshAccessToken,
  resetNativeSessionForTests,
  saveTokens,
  tokenExpiry,
} from "@/lib/auth/native-session";

/** An unsigned JWT-shaped token expiring `secondsFromNow` from now. */
function token(secondsFromNow: number, id = "a"): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow, id }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

function refreshResponse(access: string, refresh: string): Response {
  return new Response(JSON.stringify({ success: true, data: { access, refresh } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("native session (the app's Bearer-token transport)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    stored.clear();
    resetNativeSessionForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("apiUrl", () => {
    it("builds the Django URL the BFF would have forwarded to", () => {
      expect(apiUrl("users/me")).toBe("https://api.baraqapp.com/api/v1/users/me/");
      expect(apiUrl("/quizzes/4/", "?page=2")).toBe(
        "https://api.baraqapp.com/api/v1/quizzes/4/?page=2",
      );
    });

    it.each(["quizzes/../admin", "quizzes/./4", "quizzes//4", "quizzes/4%2F..", "a\\b"])(
      "refuses %s (an id from a deep link must not walk the path)",
      (path) => {
        expect(() => apiUrl(path)).toThrow("Invalid API path");
      },
    );
  });

  it("reads a JWT's expiry without verifying it", () => {
    const expiry = tokenExpiry(token(600));
    expect(expiry).toBeGreaterThan(Date.now() / 1000 + 590);
    expect(tokenExpiry("garbage")).toBeNull();
  });

  it("keeps the access token in memory and only the refresh token in storage", async () => {
    await saveTokens({ access: token(600), refresh: "r1" });
    expect([...stored.entries()]).toEqual([["refresh", "r1"]]);
    expect(await getAccessToken()).toBe(token(600));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes once however many callers ask at the same time, and stores the rotated token", async () => {
    stored.set("refresh", "r1");
    fetchMock.mockResolvedValue(refreshResponse(token(1800, "new"), "r2"));

    const results = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.baraqapp.com/api/v1/auth/refresh/");
    expect(JSON.parse(init.body)).toEqual({ refresh: "r1" });
    expect(init.credentials).toBe("omit");
    expect(new Set(results)).toEqual(new Set([token(1800, "new")]));
    expect(stored.get("refresh")).toBe("r2");
  });

  it("renews early when asked for a longer validity (uploads ask for 20 minutes)", async () => {
    await saveTokens({ access: token(300), refresh: "r1" });
    fetchMock.mockResolvedValue(refreshResponse(token(1800, "long"), "r2"));

    expect(await getAccessToken(30)).toBe(token(300));
    expect(await getAccessToken(20 * 60)).toBe(token(1800, "long"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the backend rejects the refresh token", async () => {
    stored.set("refresh", "revoked");
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    const ended = vi.fn();
    onSessionEnded(ended);

    expect(await refreshAccessToken()).toBeNull();
    expect(stored.has("refresh")).toBe(false);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(await hasSession()).toBe(false);
  });

  it("keeps the session through an outage (offline or 5xx) instead of logging out", async () => {
    stored.set("refresh", "r1");
    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(SessionUnavailableError);
    expect(stored.get("refresh")).toBe("r1");

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await hasSession()).toBe(true);
    expect(stored.get("refresh")).toBe("r1");
  });

  it("has no session and makes no request without a stored refresh token", async () => {
    expect(await hasSession()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clearTokens forgets both tokens", async () => {
    await saveTokens({ access: token(600), refresh: "r1" });
    await clearTokens();
    expect(stored.size).toBe(0);
    expect(await getAccessToken()).toBeNull();
  });
});

describe("detailHref", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the web's path URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_TARGET", "");
    const { detailHref } = await import("@/lib/routing/detail-href");
    expect(detailHref("quizzes", 4)).toBe("/quizzes/4");
    expect(detailHref("library/collections", "c-1")).toBe("/library/collections/c-1");
  });

  it("uses the app's static view?id= pages in the native build", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_TARGET", "native");
    const { detailHref } = await import("@/lib/routing/detail-href");
    expect(detailHref("quizzes/attempts", 7)).toBe("/quizzes/attempts/view?id=7");
    expect(detailHref("projects", "a b&c")).toBe("/projects/view?id=a%20b%26c");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
  validateMutationCsrf: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getAccessToken: mocks.getAccessToken,
  getRefreshToken: mocks.getRefreshToken,
  refreshAccessToken: mocks.refreshAccessToken,
  logout: mocks.logout,
  validateMutationCsrf: mocks.validateMutationCsrf,
}));

import { GET as session } from "@/app/api/auth/session/route";
import { POST as logout } from "@/app/api/auth/logout/route";

describe("Web auth session lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateMutationCsrf.mockResolvedValue(true);
  });

  it("reports authenticated on a valid access token, without a backend call", async () => {
    mocks.getAccessToken.mockResolvedValue("opaque-access");

    const response = await session();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { authenticated: true },
    });
    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it(
    "with no access token, actually validates a refresh cookie against the " +
      "backend rather than trusting its mere presence",
    async () => {
      mocks.getAccessToken.mockResolvedValue(undefined);
      mocks.getRefreshToken.mockResolvedValue("opaque-refresh");
      mocks.refreshAccessToken.mockResolvedValue("new-access-token");

      const response = await session();

      expect(mocks.refreshAccessToken).toHaveBeenCalledOnce();
      await expect(response.json()).resolves.toMatchObject({
        data: { authenticated: true },
      });
    },
  );

  it(
    "regression: a stale/revoked refresh cookie must report unauthenticated, " +
      "not authenticated-by-presence",
    async () => {
      // The historical bug this endpoint had: any refresh cookie, valid or
      // not, made this report `authenticated: true`.
      mocks.getAccessToken.mockResolvedValue(undefined);
      mocks.getRefreshToken.mockResolvedValue("stale-or-revoked-refresh-token");
      mocks.refreshAccessToken.mockResolvedValue(null);

      const response = await session();

      await expect(response.json()).resolves.toMatchObject({
        data: { authenticated: false },
      });
    },
  );

  it("reports unauthenticated (not a crash) when the backend is unreachable during the check", async () => {
    mocks.getAccessToken.mockResolvedValue(undefined);
    mocks.getRefreshToken.mockResolvedValue("opaque-refresh");
    mocks.refreshAccessToken.mockRejectedValue(new Error("backend unreachable"));

    const response = await session();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { authenticated: false },
    });
  });

  it("reports unauthenticated when neither cookie is present, without calling refresh", async () => {
    mocks.getAccessToken.mockResolvedValue(undefined);
    mocks.getRefreshToken.mockResolvedValue(undefined);

    const response = await session();

    await expect(response.json()).resolves.toMatchObject({
      data: { authenticated: false },
    });
    expect(mocks.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("validates CSRF, performs logout and returns a no-store response", async () => {
    const response = await logout(
      new NextRequest("https://web.baraqapp.com/api/auth/logout", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
});

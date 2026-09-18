import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  logout: vi.fn(),
  validateMutationCsrf: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getAccessToken: mocks.getAccessToken,
  getRefreshToken: mocks.getRefreshToken,
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

  it("reports cookie-backed session presence explicitly and never caches it", async () => {
    mocks.getAccessToken.mockResolvedValue(undefined);
    mocks.getRefreshToken.mockResolvedValue("opaque-refresh");

    const response = await session();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { authenticated: true },
    });
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

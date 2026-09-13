import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { backendFetch, clearAuthCookies } = vi.hoisted(() => ({
  backendFetch: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/lib/api/backend", () => ({ backendFetch }));
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

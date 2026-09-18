import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  validateMutationCsrf: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  login: mocks.login,
  validateMutationCsrf: mocks.validateMutationCsrf,
}));

import { POST } from "@/app/api/auth/login/route";

function request(body: unknown) {
  return new NextRequest("https://web.baraqapp.com/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": "csrf-token",
      "X-Request-ID": "login-request-id",
    },
    body: JSON.stringify(body),
  });
}

describe("Web POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateMutationCsrf.mockResolvedValue(true);
  });

  it("reads the JSON body once and forwards the exact validated credentials", async () => {
    mocks.login.mockResolvedValue({ ok: true, user: { id: 7, role: "student" } });
    const credentials = { email: "student@example.com", password: "Exact Password 123!" };

    const response = await POST(request(credentials));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.login).toHaveBeenCalledWith(
      credentials.email,
      credentials.password,
      "login-request-id",
    );
  });

  it("preserves the backend authentication 401 instead of returning a validation 400", async () => {
    mocks.login.mockResolvedValue({
      ok: false,
      status: 401,
      body: { success: false, message: "Invalid credentials", code: "authentication_error" },
    });

    const response = await POST(
      request({ email: "nobody@example.com", password: "NotARealPassword123!" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "authentication_error" });
  });

  it("keeps malformed input as a real validation error without calling Django", async () => {
    const response = await POST(request({ email: "not-an-email", password: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "validation_error" });
    expect(mocks.login).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { accessCookieOptions, refreshCookieOptions, csrfCookieOptions } from "@/lib/auth/cookies";

describe("auth cookie options", () => {
  it("marks access and refresh cookies HttpOnly, unlike the CSRF cookie", () => {
    expect(accessCookieOptions().httpOnly).toBe(true);
    expect(refreshCookieOptions().httpOnly).toBe(true);
    expect(csrfCookieOptions().httpOnly).toBe(false);
  });

  it("sets SameSite=Lax and a path of / on every auth cookie", () => {
    for (const options of [accessCookieOptions(), refreshCookieOptions(), csrfCookieOptions()]) {
      expect(options.sameSite).toBe("lax");
      expect(options.path).toBe("/");
    }
  });

  it("gives the access token a shorter max-age than the refresh token", () => {
    expect(accessCookieOptions().maxAge).toBeLessThan(refreshCookieOptions().maxAge);
  });

  it("matches the backend's documented token lifetimes (30 min access / 14 day refresh)", () => {
    expect(accessCookieOptions().maxAge).toBe(60 * 30);
    expect(refreshCookieOptions().maxAge).toBe(60 * 60 * 24 * 14);
  });
});

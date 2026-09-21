/**
 * Regression coverage for src/proxy.ts's route-protection decision.
 *
 * The historical bug: `hasSession && isPublicPath` redirected a visitor
 * *away* from `/login` and `/register` whenever an access or refresh
 * cookie merely existed -- cookie presence, not a verified session (this
 * proxy makes no backend call). A stale, expired, or simply fake cookie
 * therefore permanently bounced a real user away from the one page that
 * could fix it, with no way back in. The fix removes that branch entirely:
 * public auth paths are never redirected away from here, regardless of
 * cookie state.
 *
 * Tests `resolveAuthRedirectTarget` directly -- the pure decision function
 * `proxy()` calls -- rather than `proxy()` itself: invoking `proxy()`
 * always also runs next-intl's `createMiddleware`, whose published ESM
 * build does not resolve under this project's Vitest setup (an
 * environment/tooling limitation unrelated to this file's own code). The
 * decision under test here is exactly the logic that had the bug and is
 * exactly what changed to fix it.
 */

import { describe, expect, it } from "vitest";
import { resolveAuthRedirectTarget } from "@/lib/auth/resolve-auth-redirect";

describe("resolveAuthRedirectTarget — public auth paths are always reachable", () => {
  it("does not redirect /login with no cookies at all", () => {
    expect(resolveAuthRedirectTarget("/en/login", "en", "login", false)).toBeNull();
  });

  it("does not redirect /login when a session cookie is present (real or fake)", () => {
    expect(resolveAuthRedirectTarget("/en/login", "en", "login", true)).toBeNull();
  });

  it("does not redirect /register, cookies present or not", () => {
    expect(resolveAuthRedirectTarget("/en/register", "en", "register", false)).toBeNull();
    expect(resolveAuthRedirectTarget("/en/register", "en", "register", true)).toBeNull();
  });

  it("does not redirect /ar/login or /ar/register, cookies present or not", () => {
    expect(resolveAuthRedirectTarget("/ar/login", "ar", "login", false)).toBeNull();
    expect(resolveAuthRedirectTarget("/ar/login", "ar", "login", true)).toBeNull();
    expect(resolveAuthRedirectTarget("/ar/register", "ar", "register", false)).toBeNull();
    expect(resolveAuthRedirectTarget("/ar/register", "ar", "register", true)).toBeNull();
  });

  it("never redirects any public segment away, for either session state", () => {
    for (const segment of ["login", "register", "verify-email", "forgot-password", "reset-password"]) {
      for (const hasSession of [true, false]) {
        expect(
          resolveAuthRedirectTarget(`/en/${segment}`, "en", segment, hasSession),
          `${segment} hasSession=${hasSession}`,
        ).toBeNull();
      }
    }
  });
});

describe("resolveAuthRedirectTarget — protected paths still require a session", () => {
  it("redirects a logged-out visitor from /en to /en/login?next=/en", () => {
    expect(resolveAuthRedirectTarget("/en", "en", undefined, false)).toBe("/en/login?next=%2Fen");
  });

  it("redirects a logged-out visitor from /ar to /ar/login?next=/ar", () => {
    expect(resolveAuthRedirectTarget("/ar", "ar", undefined, false)).toBe("/ar/login?next=%2Far");
  });

  it("preserves a deeper protected path in ?next=", () => {
    expect(resolveAuthRedirectTarget("/en/projects", "en", "projects", false)).toBe(
      "/en/login?next=%2Fen%2Fprojects",
    );
    expect(resolveAuthRedirectTarget("/ar/study-plans", "ar", "study-plans", false)).toBe(
      "/ar/login?next=%2Far%2Fstudy-plans",
    );
  });

  it("does not redirect a protected path when a session cookie is present", () => {
    expect(resolveAuthRedirectTarget("/en", "en", undefined, true)).toBeNull();
    expect(resolveAuthRedirectTarget("/en/projects", "en", "projects", true)).toBeNull();
  });
});

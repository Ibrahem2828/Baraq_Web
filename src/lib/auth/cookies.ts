import "server-only";
import { serverEnv } from "@/config/env";

export { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE } from "./cookie-names";

/**
 * Access and refresh tokens are both stored as HttpOnly cookies — never
 * exposed to browser JS. All backend calls are proxied through
 * `app/api/bff/[...path]/route.ts`, which reads these cookies server-side and
 * attaches the `Authorization` header itself. This is a deliberate choice
 * over the "memory-only access token" alternative described in the brief:
 * the backend's CORS allowlist does not yet include this app's origin
 * (`CORS_ALLOWED_ORIGINS` in the Django settings), so direct browser→backend
 * calls are not possible today regardless — see docs/AUTH_SECURITY.md.
 */
export function cookieOptions(httpOnly = true) {
  return {
    httpOnly,
    secure: serverEnv.AUTH_COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    domain: serverEnv.AUTH_COOKIE_DOMAIN || undefined,
  };
}

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 30; // 30 min, matches backend ACCESS_TOKEN_LIFETIME_MINUTES
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days, matches backend REFRESH_TOKEN_LIFETIME_DAYS

export function accessCookieOptions() {
  return { ...cookieOptions(true), maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS };
}

export function refreshCookieOptions() {
  return { ...cookieOptions(true), maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS };
}

/** Not HttpOnly — the client must be able to read it to echo it back as a header (double-submit CSRF). */
export function csrfCookieOptions() {
  return { ...cookieOptions(false), maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS };
}

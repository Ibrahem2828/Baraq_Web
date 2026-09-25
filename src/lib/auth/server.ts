import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { BackendResponseError, backendFetch, logBackendFailure } from "@/lib/api/backend";
import { endpoints } from "@/lib/api/endpoints";
import type { SuccessEnvelope } from "@/lib/api/envelope";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  csrfCookieOptions,
} from "./cookies";

interface LoginResponseData {
  access: string;
  refresh: string;
  user: Record<string, unknown>;
}

/** Whatever JSON body the backend sent back for a failed auth request — forwarded to the client as-is (see login()/verifyEmail() below) so real error codes/messages survive instead of being discarded. */
type AuthFailureBody = Record<string, unknown> | null;

interface RefreshResponseData {
  access: string;
  refresh: string;
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

export async function setAuthCookies(tokens: { access: string; refresh: string }): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access, accessCookieOptions());
  store.set(REFRESH_COOKIE, tokens.refresh, refreshCookieOptions());
}

/**
 * Expires every cookie the session is made of.
 *
 * `cookies().delete(name)` is deliberately not used: it emits a host-only,
 * `Path=/` expiry. A cookie is keyed by (name, domain, path), so once
 * `AUTH_COOKIE_DOMAIN` is configured that expiry creates a *different* cookie
 * and leaves the real, domain-scoped refresh token live in the browser.
 * Overwriting with the exact options each cookie was written with is the only
 * form that reliably removes it.
 *
 * The CSRF token goes too — it is a per-session double-submit secret, and
 * carrying one across a sign-out would let it be replayed against the next
 * user of the same browser.
 */
export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  const expire = <T extends object>(options: T) => ({ ...options, maxAge: 0 });
  store.set(ACCESS_COOKIE, "", expire(accessCookieOptions()));
  store.set(REFRESH_COOKIE, "", expire(refreshCookieOptions()));
  store.set(CSRF_COOKIE, "", expire(csrfCookieOptions()));
}

/**
 * Token refresh, deduplicated per session.
 *
 * The backend rotates refresh tokens and blacklists the old one on every
 * refresh. Two things follow, and both used to break:
 *
 *  - Concurrent refreshes must be collapsed *per refresh token*. The lock was
 *    once a single module-level promise shared by every user, so two users
 *    refreshing at the same moment could hand the second one the first one's
 *    access token.
 *  - A request that started before a rotation still carries the old refresh
 *    token (a slow upload, or a burst of requests whose responses with the new
 *    cookies have not reached the browser yet). Presenting the blacklisted
 *    token failed, and the BFF then cleared the cookies -- signing the learner
 *    out mid-upload ("Your session has expired"). For a short window the
 *    result of a rotation is remembered, keyed by a hash of the token it
 *    replaced, and such a request continues with it instead.
 *
 * This state is per Node.js process; the web service runs a single process.
 */
interface TokenPair {
  access: string;
  refresh: string;
}

const ROTATION_REUSE_WINDOW_MS = 2 * 60_000;
const refreshFlights = new Map<string, Promise<TokenPair | null>>();
const recentRotations = new Map<string, { pair: TokenPair; at: number }>();

function tokenKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Seconds-since-epoch expiry of a JWT, or null when it cannot be read. Not a verification: only used to decide whether to refresh. */
export function tokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

function validForAtLeast(token: string, seconds: number): boolean {
  const expiry = tokenExpiry(token);
  return expiry !== null && expiry * 1000 - Date.now() > seconds * 1000;
}

/** The newest pair issued in place of `refresh` within the reuse window. */
function latestRotation(refresh: string): TokenPair | null {
  const now = Date.now();
  for (const [key, entry] of recentRotations) {
    if (now - entry.at > ROTATION_REUSE_WINDOW_MS) recentRotations.delete(key);
  }
  let pair: TokenPair | null = null;
  let key = tokenKey(refresh);
  for (let hops = 0; hops < 10; hops += 1) {
    const entry = recentRotations.get(key);
    if (!entry) break;
    pair = entry.pair;
    key = tokenKey(entry.pair.refresh);
  }
  return pair;
}

async function rotate(refresh: string): Promise<TokenPair | null> {
  const key = tokenKey(refresh);
  const inFlight = refreshFlights.get(key);
  if (inFlight) return inFlight;

  const flight = (async () => {
    const response = await backendFetch(endpoints.auth.refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      // Transport, redirect, and upstream 5xx failures are operational
      // outages, not evidence that the refresh token is invalid. Let the BFF
      // classify them and preserve the cookies for a later retry.
      if (response.status >= 300 && response.status < 400) {
        throw new BackendResponseError(response.status);
      }
      if (response.status >= 500) {
        throw new BackendResponseError(response.status);
      }
      return null;
    }
    const envelope = (await response.json()) as SuccessEnvelope<RefreshResponseData>;
    const pair = { access: envelope.data.access, refresh: envelope.data.refresh };
    recentRotations.set(key, { pair, at: Date.now() });
    return pair;
  })();

  refreshFlights.set(key, flight);
  try {
    return await flight;
  } finally {
    refreshFlights.delete(key);
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  let pair = latestRotation(refresh);
  if (!pair || !validForAtLeast(pair.access, 30)) {
    pair = await rotate(pair?.refresh ?? refresh);
  }
  // Cookies are written here, in the caller's own request, never inside the
  // shared flight: every caller's response must carry its session's tokens.
  if (!pair) {
    await clearAuthCookies();
    return null;
  }
  await setAuthCookies(pair);
  return pair.access;
}

/**
 * An access token that stays valid for at least `seconds`, refreshing first
 * if needed. Used before an upload: its request carries the cookies it
 * started with for as long as the file takes to arrive.
 */
export async function ensureFreshAccessToken(seconds: number): Promise<string | null> {
  const access = await getAccessToken();
  if (access && validForAtLeast(access, seconds)) return access;
  return refreshAccessToken();
}

/** Test hook: forget remembered rotations between isolated test cases. */
export function resetRefreshStateForTests(): void {
  refreshFlights.clear();
  recentRotations.clear();
}

type AuthResult =
  | { ok: true; user: Record<string, unknown> }
  | { ok: false; status: number; body: AuthFailureBody };

/**
 * A 3xx from Django should never happen for these well-formed, slash-terminated
 * calls, but relaying one raw to the browser (as a bare status forwarded via
 * `NextResponse.json`) would leak an unusable redirect response instead of a
 * normal API error — the same failure mode the generic BFF proxy already
 * fails closed against in `app/api/bff/[...path]/route.ts`. Applies the
 * identical guard here since `login`/`verifyEmail` bypass that proxy.
 */
function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

const UPSTREAM_REDIRECT_RESULT: AuthResult = {
  ok: false,
  status: 502,
  body: { success: false, message: "Upstream service error", code: "upstream_redirect" },
};

export async function login(
  email: string,
  password: string,
  requestId?: string | null,
): Promise<AuthResult> {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await backendFetch(endpoints.auth.login, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "X-Request-ID": requestId } : {}),
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    const { status } = logBackendFailure("auth/login", error, startedAt, requestId);
    return { ok: false, status, body: null };
  }

  if (!response.ok) {
    if (isRedirectStatus(response.status)) {
      console.error("[auth/login] unexpected upstream redirect", {
        status: response.status,
        requestId: requestId || undefined,
      });
      return UPSTREAM_REDIRECT_RESULT;
    }
    const body = (await response.json().catch(() => null)) as AuthFailureBody;
    return { ok: false, status: response.status, body };
  }

  const envelope = (await response.json()) as SuccessEnvelope<LoginResponseData>;
  await setAuthCookies({ access: envelope.data.access, refresh: envelope.data.refresh });
  return { ok: true, user: envelope.data.user };
}

/** Verifies a registration email-OTP code. On success the backend logs the user in directly (same `{access, refresh, user}` shape as login), so this sets cookies exactly like `login()` does. */
export async function verifyEmail(
  email: string,
  code: string,
  requestId?: string | null,
): Promise<AuthResult> {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await backendFetch(endpoints.auth.verifyEmail, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "X-Request-ID": requestId } : {}),
      },
      body: JSON.stringify({ email, code }),
    });
  } catch (error) {
    const { status } = logBackendFailure("auth/verify-email", error, startedAt, requestId);
    return { ok: false, status, body: null };
  }

  if (!response.ok) {
    if (isRedirectStatus(response.status)) {
      console.error("[auth/verify-email] unexpected upstream redirect", {
        status: response.status,
        requestId: requestId || undefined,
      });
      return UPSTREAM_REDIRECT_RESULT;
    }
    const body = (await response.json().catch(() => null)) as AuthFailureBody;
    return { ok: false, status: response.status, body };
  }

  const envelope = (await response.json()) as SuccessEnvelope<LoginResponseData>;
  await setAuthCookies({ access: envelope.data.access, refresh: envelope.data.refresh });
  return { ok: true, user: envelope.data.user };
}

export async function logout(): Promise<void> {
  let refresh = await getRefreshToken();
  let access = await getAccessToken();
  if (refresh) {
    try {
      if (!access) {
        access = (await refreshAccessToken()) ?? undefined;
        refresh = await getRefreshToken();
      }

      if (access && refresh) {
        let response = await backendFetch(endpoints.auth.logout, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ refresh }),
        });

        // Logout requires an access token at the Django boundary so that one
        // session cannot revoke another session's refresh token. If the access
        // token expired while the browser was idle, refresh once and retry with
        // the rotated pair; otherwise the browser would look signed out while
        // the original refresh token remained usable until its full expiry.
        if (response.status === 401) {
          access = (await refreshAccessToken()) ?? undefined;
          refresh = await getRefreshToken();
          if (access && refresh) {
            response = await backendFetch(endpoints.auth.logout, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${access}`,
              },
              body: JSON.stringify({ refresh }),
            });
          }
        }
      }
    } catch {
      // Best-effort: always clear local cookies even if backend revocation fails.
    }
  }
  await clearAuthCookies();
}

/** Double-submit CSRF cookie helpers. Only mutation requests (non-GET) via the BFF proxy are checked. */
export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(32).toString("hex");
  store.set(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export async function validateMutationCsrf(request: Request): Promise<boolean> {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      const originHost = new URL(origin).host;
      if (host && originHost !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}

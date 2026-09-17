import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { backendFetch, logBackendFailure } from "@/lib/api/backend";
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

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * In-process single-flight lock for token refresh. Collapses concurrent
 * refresh attempts triggered by multiple parallel BFF requests (e.g. several
 * widgets on one page all 401-ing at once) into a single upstream call —
 * closing a gap noted in the existing admin dashboard's BFF, which issues one
 * refresh call per concurrent 401.
 *
 * This dedups within a single Node.js server process only. A horizontally
 * scaled deployment (multiple instances behind a load balancer) would need a
 * distributed lock (e.g. Redis `SETNX`) for full cross-instance dedup — noted
 * as a Phase 2 follow-up in docs/AUTH_SECURITY.md, not required for
 * correctness (refresh token rotation is safe to attempt more than once
 * across instances; it just costs an extra upstream call and, worst case,
 * one instance's refresh call loses a race and its user is signed out).
 */
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;

    try {
      const response = await backendFetch(endpoints.auth.refresh, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        await clearAuthCookies();
        return null;
      }

      const envelope = (await response.json()) as SuccessEnvelope<RefreshResponseData>;
      await setAuthCookies({ access: envelope.data.access, refresh: envelope.data.refresh });
      return envelope.data.access;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await backendFetch(endpoints.auth.logout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
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

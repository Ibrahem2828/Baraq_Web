"use client";

import { publicEnv } from "@/config/env.public";
import { endpoints } from "@/lib/api/endpoints";
import type { SuccessEnvelope } from "@/lib/api/envelope";

/**
 * The app's session (IS_NATIVE builds only; see docs/MOBILE_APP.md).
 *
 * The web keeps both tokens in HttpOnly cookies behind its /api/bff proxy.
 * The app has no server of its own: it is a static bundle on
 * https://localhost calling the Django API directly, as the Expo app does.
 *
 *  - The access token (30 minutes) lives in memory only and is sent as
 *    `Authorization: Bearer`.
 *  - The refresh token (14 days, rotated on every use) lives in the Android
 *    Keystore / iOS Keychain through @aparajita/capacitor-secure-storage,
 *    never in localStorage or a cookie. (In a desktop browser running the
 *    app build for testing, that plugin falls back to localStorage.)
 *  - No cookie is sent anywhere, so there is no CSRF surface to defend.
 *
 * Refresh is single-flight: the backend blacklists a refresh token once it
 * has been rotated, so two parallel refreshes with the same token would log
 * the learner out.
 */

const REFRESH_KEY = "refresh";
const STORAGE_PREFIX = "baraq_";

/** Refresh when the access token has less than this left. */
const DEFAULT_MIN_VALIDITY_SECONDS = 30;

interface TokenPair {
  access: string;
  refresh: string;
}

/** The refresh failed for a reason other than the token being rejected (offline, 5xx). */
export class SessionUnavailableError extends Error {
  constructor(message = "Session could not be refreshed") {
    super(message);
    this.name = "SessionUnavailableError";
  }
}

let accessToken: string | null = null;
/** `undefined` until read from secure storage once. */
let refreshToken: string | null | undefined;
let refreshFlight: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

/**
 * The plugin, wrapped: a Capacitor plugin proxy answers every property,
 * `then` included, so returning it from an async function makes `await`
 * call `SecureStorage.then()` ("not implemented") instead of resolving.
 */
async function secureStorage() {
  const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
  await SecureStorage.setKeyPrefix(STORAGE_PREFIX);
  return { storage: SecureStorage };
}

export async function readRefreshToken(): Promise<string | null> {
  if (refreshToken === undefined) {
    const { storage } = await secureStorage();
    refreshToken = (await storage.getItem(REFRESH_KEY)) ?? null;
  }
  return refreshToken;
}

export async function saveTokens(pair: TokenPair): Promise<void> {
  accessToken = pair.access;
  refreshToken = pair.refresh;
  const { storage } = await secureStorage();
  await storage.setItem(REFRESH_KEY, pair.refresh);
}

export async function clearTokens(): Promise<void> {
  const hadSession = accessToken !== null || Boolean(refreshToken);
  accessToken = null;
  refreshToken = null;
  const { storage } = await secureStorage();
  await storage.removeItem(REFRESH_KEY);
  if (hadSession) for (const listener of listeners) listener();
}

/** Called when the session ends underneath the UI (a rejected refresh, a final 401). */
export function onSessionEnded(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Seconds-since-epoch expiry of a JWT, or null. Not a verification. */
export function tokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

function validForAtLeast(token: string, seconds: number): boolean {
  const expiry = tokenExpiry(token);
  return expiry !== null && expiry * 1000 - Date.now() > seconds * 1000;
}

/**
 * `https://api…/api/v1/<path>/<query>`, the URL the web's BFF would have
 * forwarded to. Paths come from `endpoints.ts` plus record ids, and an id
 * can arrive from a deep link (`view?id=`): a segment that would walk out of
 * the path is refused, as the BFF refuses it.
 */
export function apiUrl(path: string, query = ""): string {
  const normalized = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = normalized ? normalized.split("/") : [];
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\") ||
        /%(2f|5c|2e)/i.test(segment),
    )
  ) {
    throw new Error("Invalid API path");
  }
  const apiPath = segments.length ? `/api/v1/${segments.join("/")}/` : "/api/v1/";
  return `${publicEnv.NEXT_PUBLIC_API_BASE_URL}${apiPath}${query}`;
}

async function rotate(refresh: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(apiUrl(endpoints.auth.refresh), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new SessionUnavailableError();
  }
  if (response.status >= 500) throw new SessionUnavailableError();
  if (!response.ok) {
    // Rejected, expired or blacklisted: this session is over.
    await clearTokens();
    return null;
  }
  const envelope = (await response.json()) as SuccessEnvelope<TokenPair>;
  await saveTokens({ access: envelope.data.access, refresh: envelope.data.refresh });
  return envelope.data.access;
}

/** Renew the access token once, however many callers ask at the same time. */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      const refresh = await readRefreshToken();
      if (!refresh) return null;
      return rotate(refresh);
    })().finally(() => {
      refreshFlight = null;
    });
  }
  return refreshFlight;
}

/**
 * An access token valid for at least `minValiditySeconds`, refreshing when
 * needed; null when there is no session. An upload asks for 20 minutes so it
 * never needs a refresh while its body is still being sent.
 */
export async function getAccessToken(
  minValiditySeconds = DEFAULT_MIN_VALIDITY_SECONDS,
): Promise<string | null> {
  if (accessToken && validForAtLeast(accessToken, minValiditySeconds)) return accessToken;
  return refreshAccessToken();
}

/** Whether a session exists that the backend still accepts. Offline counts as "keep it". */
export async function hasSession(): Promise<boolean> {
  try {
    return Boolean(await getAccessToken());
  } catch (error) {
    if (error instanceof SessionUnavailableError) return Boolean(await readRefreshToken());
    throw error;
  }
}

/** Test seam: forget the in-memory state. */
export function resetNativeSessionForTests(): void {
  accessToken = null;
  refreshToken = undefined;
  refreshFlight = null;
  listeners.clear();
}

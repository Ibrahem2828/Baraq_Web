"use client";

import { loadNativeSession } from "@/lib/auth/load-native-session";
import { CSRF_COOKIE } from "@/lib/auth/cookie-names";
import { readClientCookie } from "@/lib/utils/cookies-client";
import { createRequestId } from "@/lib/utils/request-id";
import { APP_DEFAULTS } from "@/config/constants";
import { endpoints } from "./endpoints";
import type { ErrorEnvelope, SuccessEnvelope } from "./envelope";
import { ApiError, fromErrorEnvelope, fromNetworkError } from "./errors";

// The app build (scripts/build-native.mjs) or the web one. Read here, not
// imported: Next inlines the literal, so the other build's branch is
// removed from this bundle (see docs/MOBILE_APP.md).
const IS_NATIVE = process.env.NEXT_PUBLIC_BUILD_TARGET === "native";

/**
 * Client-side fetch wrapper. Never talks to the backend directly — every call
 * goes through `/api/bff/*` (see `app/api/bff/[...path]/route.ts`), which
 * injects the `Authorization` header from an HttpOnly cookie server-side.
 * Mirrors the mobile app's `apiClient.ts` behavior (transient-GET retry,
 * request-id correlation) adapted to the BFF architecture.
 *
 * The app build (IS_NATIVE) has no BFF: `send()` calls the Django API
 * directly with the Bearer token from lib/auth/native-session, and does the
 * BFF's 401 -> refresh once -> retry once itself. Everything above `send()`
 * is the same for both.
 */

let csrfTokenPromise: Promise<string> | null = null;

export async function ensureCsrfToken(): Promise<string> {
  const existing = readClientCookie(CSRF_COOKIE);
  if (existing) return existing;

  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/auth/csrf", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((json: SuccessEnvelope<{ csrfToken: string }>) => json.data.csrfToken)
      .finally(() => {
        csrfTokenPromise = null;
      });
  }
  return csrfTokenPromise;
}

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isTransientTransportError(error: unknown, status: number | undefined): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  return error instanceof TypeError; // fetch network failure
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Internal: used for the one-shot transient-GET retry. */
  _isRetry?: boolean;
}

function buildQuery(params?: RequestOptions["params"]): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * One HTTP exchange with the API, authenticated the way this build does it.
 *
 * Web: `/api/bff/<path>` on this origin; the BFF adds the Bearer token from
 * its HttpOnly cookie, so the browser only proves the request is its own
 * (double-submit CSRF token on mutations).
 *
 * App: `https://api…/api/v1/<path>/` with the Bearer token from memory, no
 * cookies. A 401 on a request that carried a token gets one refresh and one
 * retry, as the BFF does; a 401 after that ends the session. So does
 * deleting the account, which revokes every token.
 */
async function send(
  method: string,
  normalizedPath: string,
  query: string,
  init: { headers: Headers; body?: BodyInit; signal?: AbortSignal },
): Promise<Response> {
  if (!IS_NATIVE) {
    if (MUTATING_METHODS.has(method)) {
      init.headers.set("X-CSRF-Token", await ensureCsrfToken());
    }
    return fetch(`/api/bff/${normalizedPath}${query}`, {
      method,
      headers: init.headers,
      body: init.body,
      credentials: "same-origin",
      signal: init.signal,
    });
  }

  // Loaded on first use, never imported statically: the web bundle then has
  // no trace of the app's token handling.
  const { apiUrl, clearTokens, getAccessToken, refreshAccessToken } = await loadNativeSession();
  const url = apiUrl(normalizedPath, query);
  const attempt = (token: string | null) => {
    if (token) init.headers.set("Authorization", `Bearer ${token}`);
    else init.headers.delete("Authorization");
    return fetch(url, {
      method,
      headers: init.headers,
      body: init.body,
      credentials: "omit",
      cache: "no-store",
      signal: init.signal,
    });
  };

  const token = await getAccessToken();
  let response = await attempt(token);
  if (response.status === 401 && token) {
    const renewed = await refreshAccessToken();
    if (renewed) response = await attempt(renewed);
  }
  if (response.status === 401 && token) await clearTokens();
  if (method === "DELETE" && response.ok && `/${normalizedPath}/` === endpoints.users.me) {
    await clearTokens();
  }
  return response;
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  // Strip both leading and trailing slashes: `endpoints.ts` paths are
  // written with a trailing slash for Django's benefit (APPEND_SLASH), but
  // a `/api/bff/...` URL that itself ends in `/` doesn't match this route's
  // canonical (non-trailing-slash) form, so Next.js's own redirect handling
  // 308s it before the route handler runs. The trailing slash Django wants
  // is re-added downstream by `buildTargetPath` in the BFF route handler.
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const query = buildQuery(options.params);

  const headers = new Headers();
  headers.set("X-Request-ID", createRequestId());

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let requestBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isFormData) {
      requestBody = body as FormData;
    } else {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? APP_DEFAULTS.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await send(method, normalizedPath, query, { headers, body: requestBody, signal });
  } catch (error) {
    if (method === "GET" && !options._isRetry && isTransientTransportError(error, undefined)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return request<T>(method, path, body, { ...options, _isRetry: true });
    }
    throw fromNetworkError(error);
  }

  if (!response.ok) {
    if (
      method === "GET" &&
      !options._isRetry &&
      isTransientTransportError(undefined, response.status)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return request<T>(method, path, body, { ...options, _isRetry: true });
    }

    const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw fromErrorEnvelope(envelope, response.status, response.headers);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const envelope = (await response.json()) as SuccessEnvelope<T>;
  return envelope.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

/**
 * Fetches a paginated list and returns the DRF-style envelope's `meta`
 * alongside the items, for callers that need `count`/`next`/`previous`.
 */
export async function requestPaginated<T>(
  path: string,
  options?: RequestOptions,
): Promise<{ items: T[]; count: number; next: string | null; previous: string | null }> {
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const headers = new Headers({ "X-Request-ID": createRequestId() });

  let response: Response;
  try {
    response = await send("GET", normalizedPath, buildQuery(options?.params), { headers });
  } catch (error) {
    throw fromNetworkError(error);
  }
  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ErrorEnvelope | null;
    throw fromErrorEnvelope(envelope, response.status, response.headers);
  }
  const envelope = (await response.json()) as SuccessEnvelope<T[]>;
  const meta = envelope.meta as
    { count: number; next: string | null; previous: string | null } | undefined;
  return {
    items: envelope.data,
    count: meta?.count ?? envelope.data.length,
    next: meta?.next ?? null,
    previous: meta?.previous ?? null,
  };
}

export { ApiError };

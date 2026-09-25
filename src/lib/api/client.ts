"use client";

import { CSRF_COOKIE } from "@/lib/auth/cookie-names";
import { readClientCookie } from "@/lib/utils/cookies-client";
import { createRequestId } from "@/lib/utils/request-id";
import { APP_DEFAULTS } from "@/config/constants";
import type { ErrorEnvelope, SuccessEnvelope } from "./envelope";
import { ApiError, fromErrorEnvelope, fromNetworkError } from "./errors";

/**
 * Client-side fetch wrapper. Never talks to the backend directly — every call
 * goes through `/api/bff/*` (see `app/api/bff/[...path]/route.ts`), which
 * injects the `Authorization` header from an HttpOnly cookie server-side.
 * Mirrors the mobile app's `apiClient.ts` behavior (transient-GET retry,
 * request-id correlation) adapted to the BFF architecture.
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
  const url = `/api/bff/${normalizedPath}${buildQuery(options.params)}`;

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

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();
    headers.set("X-CSRF-Token", csrfToken);
  }

  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? APP_DEFAULTS.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      credentials: "same-origin",
      signal,
    });
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
  const url = `/api/bff/${normalizedPath}${buildQuery(options?.params)}`;
  const headers = new Headers({ "X-Request-ID": createRequestId() });

  const response = await fetch(url, { method: "GET", headers, credentials: "same-origin" });
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

import "server-only";
import { serverEnv } from "@/config/env";

/**
 * Low-level server-only fetch to the real Django backend. Never call this
 * from a Client Component — it is only ever invoked from Route Handlers
 * (`app/api/**`). Base URL comes from `BACKEND_API_URL` (server-only env, no
 * `NEXT_PUBLIC_` prefix).
 */
export function backendUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${serverEnv.BACKEND_API_URL}/api/v1${normalizedPath}`;
}

export interface BackendFetchInit extends RequestInit {
  /** Skip the default AbortSignal timeout (e.g. for long-running uploads). */
  timeoutMs?: number;
}

export async function backendFetch(path: string, init: BackendFetchInit = {}): Promise<Response> {
  const { timeoutMs, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }
  // This call always goes to the real Django backend over the internal
  // Docker network, bypassing the Caddy gateway that normally sets this
  // header for public traffic. Django trusts X-Forwarded-Proto
  // (SECURE_PROXY_SSL_HEADER in config/settings.py) to decide whether the
  // request arrived over HTTPS; without it, SECURE_SSL_REDIRECT=True makes
  // Django 301-redirect this plain-HTTP internal request to an HTTPS URL
  // that nothing internally serves.
  finalHeaders.set("X-Forwarded-Proto", "https");

  return fetch(backendUrl(path), {
    ...rest,
    headers: finalHeaders,
    cache: "no-store",
    redirect: "manual",
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs ?? serverEnv.BACKEND_API_TIMEOUT_MS),
  });
}

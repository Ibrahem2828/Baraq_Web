import "server-only";
import { serverEnv } from "@/config/env";

const backendHost = new URL(serverEnv.BACKEND_API_URL).host;

/**
 * Low-level server-only fetch to the real Django backend. Never call this
 * from a Client Component — it is only ever invoked from Route Handlers
 * (`app/api/**`). Base URL comes from `BACKEND_API_URL` (server-only env, no
 * `NEXT_PUBLIC_` prefix).
 */
export function backendUrl(path: string): string {
  if (!path || /[\\#\u0000-\u001f\u007f]/u.test(path)) {
    throw new Error("Invalid backend path");
  }

  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : path.slice(queryIndex);
  const segments = pathname.split("/").filter(Boolean);

  if (
    /^[a-z][a-z\d+.-]*:/iu.test(pathname) ||
    segments.some((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return (
          decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")
        );
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("Invalid backend path");
  }

  const normalizedPath = segments.join("/");
  const apiPath = normalizedPath ? `/api/v1/${normalizedPath}/` : "/api/v1/";
  return `${serverEnv.BACKEND_API_URL}${apiPath}${search}`;
}

export interface BackendFetchInit extends RequestInit {
  /** Skip the default AbortSignal timeout (e.g. for long-running uploads). */
  timeoutMs?: number;
}

export function classifyBackendError(error: unknown): { status: number; code: string } {
  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return { status: 504, code: "upstream_timeout" };
  }
  const causeCode =
    error instanceof Error ? (error.cause as { code?: string } | undefined)?.code : undefined;
  if (
    [
      "ERR_TLS_CERT_ALTNAME_INVALID",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "EPROTO",
    ].includes(causeCode ?? "")
  ) {
    return { status: 502, code: "upstream_tls_error" };
  }
  if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(causeCode ?? "")) {
    return { status: 502, code: "upstream_unreachable" };
  }
  return { status: 502, code: "upstream_error" };
}

export function logBackendFailure(
  operation: string,
  error: unknown,
  startedAt: number,
  requestId?: string | null,
): { status: number; code: string } {
  const classified = classifyBackendError(error);
  console.error(`[backend:${operation}] request failed`, {
    code: classified.code,
    status: classified.status,
    upstreamHost: backendHost,
    durationMs: Date.now() - startedAt,
    requestId: requestId || undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return classified;
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

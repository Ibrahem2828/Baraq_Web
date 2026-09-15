import { NextResponse, type NextRequest } from "next/server";
import { backendFetch, logBackendFailure } from "@/lib/api/backend";
import { serverEnv } from "@/config/env";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";
import { endpoints } from "@/lib/api/endpoints";
import {
  getAccessToken,
  refreshAccessToken,
  clearAuthCookies,
  validateMutationCsrf,
} from "@/lib/auth/server";

/**
 * The Backend-For-Frontend proxy. This is the ONLY place browser code's
 * requests reach the real Django backend — the browser never calls
 * `BACKEND_API_URL` directly (see docs/AUTH_SECURITY.md for why: the
 * backend's CORS allowlist doesn't include this app's origin today, and even
 * if it did, keeping tokens server-side is the safer default).
 *
 * Responsibilities:
 *  - Reconstruct the backend path + query string from the catch-all segments.
 *  - Attach `Authorization: Bearer <access>` from the HttpOnly cookie.
 *  - Validate the double-submit CSRF token on mutating methods.
 *  - On a 401 from upstream, refresh once (single-flight, see lib/auth/server.ts)
 *    and retry exactly once before giving up and clearing the session.
 *  - Forward `X-Request-ID` both ways for end-to-end correlation.
 */

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function jsonError(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function buildTargetPath(segments: string[], search: string): string {
  if (segments.some((segment) => segment === ".." || segment.includes("\\"))) {
    throw new Error("Invalid path segment");
  }
  const joined = segments.join("/");
  const withSlash = joined.length > 0 ? `/${joined}/` : "/";
  return search ? `${withSlash}?${search}` : withSlash;
}

async function forward(
  request: NextRequest,
  targetPath: string,
  accessToken: string | undefined,
  body: ArrayBuffer | undefined,
): Promise<Response> {
  const headers = new Headers();
  const incomingContentType = request.headers.get("content-type");
  if (incomingContentType) headers.set("Content-Type", incomingContentType);

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers.set("X-Request-ID", requestId);
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) headers.set("Accept-Language", acceptLanguage);

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return backendFetch(targetPath, {
    method: request.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
  });
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  let targetPath: string;
  try {
    targetPath = buildTargetPath(path ?? [], request.nextUrl.searchParams.toString());
  } catch {
    return jsonError(
      { success: false, message: "Invalid request path", code: "invalid_path" },
      400,
    );
  }

  const isMutating = MUTATING_METHODS.has(request.method);
  if (isMutating) {
    const csrfOk = await validateMutationCsrf(request);
    if (!csrfOk) {
      return jsonError(
        { success: false, message: "CSRF validation failed", code: "csrf_invalid" },
        403,
      );
    }
  }

  // Reject oversized bodies before buffering them in memory. Checked twice: the
  // declared Content-Length (cheap, catches almost every real client) and the
  // actual buffered size (catches a missing/lying Content-Length header).
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > serverEnv.BFF_MAX_BODY_BYTES) {
    return jsonError(
      { success: false, message: "Request body too large", code: "payload_too_large" },
      413,
    );
  }

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  if (body && body.byteLength > serverEnv.BFF_MAX_BODY_BYTES) {
    return jsonError(
      { success: false, message: "Request body too large", code: "payload_too_large" },
      413,
    );
  }

  let accessToken = await getAccessToken();
  if (!accessToken) {
    accessToken = (await refreshAccessToken()) ?? undefined;
  }

  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await forward(request, targetPath, accessToken, body);

    if (upstream.status === 401 && accessToken) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        upstream = await forward(request, targetPath, renewed, body);
      }
    }
  } catch (error) {
    const { status, code } = logBackendFailure(
      `bff/${(path ?? []).join("/")}`,
      error,
      startedAt,
      request.headers.get("x-request-id"),
    );
    return jsonError(
      { success: false, message: "Upstream service is temporarily unavailable", code },
      status,
    );
  }

  if (upstream.status === 401) {
    await clearAuthCookies();
  }

  // A 3xx from Django should never happen for a well-formed proxied request
  // (see buildTargetPath, which already normalizes the trailing slash), but
  // relaying one raw to the browser as-is would surface a broken redirect
  // response instead of a usable API error. Fail closed with a clear 502.
  if (upstream.status >= 300 && upstream.status < 400) {
    console.error("[bff] unexpected upstream redirect", {
      operation: request.method,
      upstreamPath: `/${(path ?? []).join("/")}/`,
      status: upstream.status,
      requestId: request.headers.get("x-request-id"),
    });
    return jsonError(
      { success: false, message: "Upstream service error", code: "upstream_redirect" },
      502,
    );
  }

  // Account deletion invalidates every backend token. Remove the browser's
  // HttpOnly tokens in the same response so the deleted session disappears
  // immediately rather than waiting for a later 401/refresh attempt.
  if (request.method === "DELETE" && targetPath === endpoints.users.me && upstream.ok) {
    await clearAuthCookies();
  }

  const responseHeaders = new Headers(NO_STORE_HEADERS);
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  const upstreamRequestId = upstream.headers.get("x-request-id");
  if (upstreamRequestId) responseHeaders.set("X-Request-ID", upstreamRequestId);
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) responseHeaders.set("Retry-After", retryAfter);

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, { status: upstream.status, headers: responseHeaders });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}
export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}

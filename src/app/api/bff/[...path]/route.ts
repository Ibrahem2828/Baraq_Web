import { NextResponse, type NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";
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
    return NextResponse.json(
      { success: false, message: "Invalid request path", code: "invalid_path" },
      { status: 400 },
    );
  }

  const isMutating = MUTATING_METHODS.has(request.method);
  if (isMutating) {
    const csrfOk = await validateMutationCsrf(request);
    if (!csrfOk) {
      return NextResponse.json(
        { success: false, message: "CSRF validation failed", code: "csrf_invalid" },
        { status: 403 },
      );
    }
  }

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  let accessToken = await getAccessToken();
  if (!accessToken) {
    accessToken = (await refreshAccessToken()) ?? undefined;
  }

  let upstream = await forward(request, targetPath, accessToken, body);

  if (upstream.status === 401 && accessToken) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      upstream = await forward(request, targetPath, renewed, body);
    }
  }

  if (upstream.status === 401) {
    await clearAuthCookies();
  }

  const responseHeaders = new Headers();
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

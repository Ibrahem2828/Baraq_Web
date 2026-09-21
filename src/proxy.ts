import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";
import { resolveAuthRedirectTarget } from "@/lib/auth/resolve-auth-redirect";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (Node.js runtime only —
 * the Edge runtime is no longer supported here). This proxy does two things,
 * in order:
 *
 *  1. Locale routing (next-intl): resolves/redirects to `/ar/...` or
 *     `/en/...` and sets the locale cookie.
 *  2. Route protection: a cheap, optimistic cookie-presence check (no token
 *     verification, no backend call) that redirects unauthenticated users
 *     away from protected routes. This is NOT the real security boundary —
 *     actual authorization happens per-request in
 *     `app/api/bff/[...path]/route.ts` (which holds the only code path that
 *     can call the backend) and in each Server Component that fetches
 *     user-specific data. A proxy check can be bypassed by a Server Action
 *     or a direct fetch to a Route Handler, so nothing downstream may assume
 *     the proxy already verified the session.
 *
 * The route-protection decision itself lives in
 * `@/lib/auth/resolve-auth-redirect` (extracted so it can be unit tested
 * without needing next-intl's middleware to run) — see that module for why
 * public auth paths are never redirected away from, in either direction.
 */

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // The intl middleware may already be issuing a redirect (e.g. adding the
  // locale prefix) — let that happen first and run the auth check on the
  // next request instead of layering another redirect on top.
  if (response.headers.get("location")) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const [locale, firstSegment] = segments;
  const isKnownLocale = (routing.locales as readonly string[]).includes(locale);
  if (!isKnownLocale) {
    return response;
  }

  const hasSession = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value,
  );

  const target = resolveAuthRedirectTarget(pathname, locale, firstSegment, hasSession);
  if (target) {
    return NextResponse.redirect(new URL(target, request.nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

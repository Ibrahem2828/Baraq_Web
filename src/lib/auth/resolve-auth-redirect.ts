/**
 * The route-protection decision `src/proxy.ts` acts on, extracted into its
 * own dependency-free module so it can be unit tested directly.
 *
 * `proxy.ts` always also runs next-intl's `createMiddleware`, whose
 * published ESM build does not resolve under this project's Vitest setup
 * (import next/server resolution issue unrelated to this file's own code)
 * -- so anything that imports `next/server` or `next-intl` at module scope,
 * even transitively, cannot be exercised directly from a unit test here.
 * This module imports neither, on purpose.
 */

const PUBLIC_SEGMENTS = new Set([
  "login",
  "register",
  "verify-email",
  "forgot-password",
  "reset-password",
]);

/**
 * Returns the redirect target (a relative URL) when `pathname` must be
 * redirected, or `null` when the request should proceed as-is.
 *
 * Public auth paths (login/register/...) are never redirected away from,
 * in either direction, regardless of `hasSession`. An earlier version also
 * redirected an apparently-authenticated visitor *away* from `/login` and
 * `/register` whenever an access or refresh cookie merely existed --
 * cookie presence is not proof of a valid session (the proxy that calls
 * this cannot call the backend to check), so a stale, expired, or simply
 * wrong cookie permanently bounced a real user away from the one page that
 * could fix it, with no way back in. Security does not depend on hiding
 * the login form from someone who is already signed in -- worst case they
 * see a form they didn't need, and BFF-level authorization (unaffected by
 * this function) still protects everything that actually matters. If a
 * signed-in visitor should be nudged away from `/login`, that belongs in
 * the page itself, after a real, backend-verified session check (see
 * `/api/auth/session`), not here.
 *
 * `locale`/`firstSegment` are the already-known-locale path's own segments
 * (e.g. `/en/login` -> locale "en", firstSegment "login"); `pathname` is
 * the full original path, used only to build the `?next=` value.
 */
export function resolveAuthRedirectTarget(
  pathname: string,
  locale: string,
  firstSegment: string | undefined,
  hasSession: boolean,
): string | null {
  const isPublicPath = firstSegment !== undefined && PUBLIC_SEGMENTS.has(firstSegment);

  if (!hasSession && !isPublicPath) {
    return `/${locale}/login?next=${encodeURIComponent(pathname)}`;
  }

  return null;
}

export { PUBLIC_SEGMENTS };

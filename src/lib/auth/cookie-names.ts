/**
 * Cookie NAME constants only — no `server-only` import, no env access, safe to
 * import from Client Components (e.g. `lib/api/client.ts` reads `CSRF_COOKIE`
 * to look up the token in `document.cookie`). Cookie *option* builders
 * (httpOnly/secure/sameSite/maxAge, which need server-only env values) live in
 * `./cookies.ts` instead — that file re-exports these same names so
 * server-only code can still import everything from one place.
 */
export const ACCESS_COOKIE = "baraq_access";
export const REFRESH_COOKIE = "baraq_refresh";
export const CSRF_COOKIE = "baraq_csrf";

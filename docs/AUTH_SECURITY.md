# Baraq Web — Authentication & Security Architecture

## 1. The core decision: BFF proxy, not direct browser→backend calls

The brief allowed either (a) direct browser calls with an in-memory access token, if
CORS permits, or (b) a Backend-For-Frontend proxy pattern, if it doesn't. **We chose (b),
for two independent reasons:**

1. **CORS doesn't permit it today.** The Django backend's `CORS_ALLOWED_ORIGINS`
   (`config/settings.py` / production `.env`) is a fixed allowlist —
   `dashboard.baraqapp.com`, `baraqapp.com`, `website.baraqapp.com` — and does not
   include this web app's future origin. `CORS_ALLOW_CREDENTIALS` also defaults to
   `False`. Someone will need to add this app's origin to that list before any
   direct-call architecture could work at all, and that's an infra change outside this
   repo.
2. **It's the safer default regardless.** Even if CORS were opened up, an in-memory
   access token still has to come from *somewhere* on page load — either a refresh call
   on every hard navigation (extra latency, and the refresh token has to live in a cookie
   anyway) or `localStorage` (explicitly prohibited by the brief). The BFF pattern avoids
   the question entirely: neither token ever reaches browser JS.

This mirrors the pattern already validated in `Baraq_Dashboard_Professional` (the
existing internal admin Next.js app), which independently arrived at the same
architecture for the same reason. We reused its shape (HttpOnly cookies, a catch-all BFF
Route Handler, double-submit CSRF) and fixed one gap it had (see §4).

## 2. Token storage

| Token | Where | Flags |
|---|---|---|
| Access token | `baraq_access` cookie | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, 30 min max-age (matches backend `ACCESS_TOKEN_LIFETIME_MINUTES`) |
| Refresh token | `baraq_refresh` cookie | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, 14 day max-age (matches backend `REFRESH_TOKEN_LIFETIME_DAYS`) |
| CSRF token | `baraq_csrf` cookie | **Not** HttpOnly (client JS must read it to echo back as a header) — double-submit pattern |

Neither the access nor the refresh token is ever serialized into a JSON response body,
`localStorage`, `sessionStorage`, or a non-HttpOnly cookie. `src/lib/auth/cookies.ts`
defines the cookie names and options in one place; `src/lib/auth/server.ts` is the only
module that reads or writes them.

## 3. Request flow

```
Browser                         Next.js server                      Django backend
  |  fetch /api/bff/quizzes/  →  app/api/bff/[...path]/route.ts
  |  (+ X-CSRF-Token header)      1. validate CSRF (mutating methods only)
  |                                2. read baraq_access cookie
  |                                3. attach Authorization: Bearer <access>
  |                                4. forward  ───────────────────→  /api/v1/quizzes/
  |                                5. if 401 → refresh once (§4) → retry once
  |  ←  JSON response (unchanged)  6. return backend's response as-is
```

Login is a **dedicated** Route Handler (`app/api/auth/login/route.ts`), not the generic
proxy, because a successful login response contains `{access, refresh, user}` that must
be split: tokens go into cookies server-side, only `user` is returned to the client.
Logout, session-presence check (`/api/auth/session`), and CSRF-token issuance
(`/api/auth/csrf`) are similarly dedicated for the same reason (they manipulate cookies
directly). Register, password reset, and password-reset-confirm are public,
side-effect-free w.r.t. cookies, so they go through the generic BFF proxy like any other
call.

## 4. Refresh handling — single-flight, closing a known gap

`src/lib/auth/server.ts`'s `refreshAccessToken()` uses an in-process promise cache: if
five concurrent requests all hit a 401 at once, only the first triggers an actual
`POST /auth/refresh/` call; the other four await the same in-flight promise. This closes
a specific gap identified in `Baraq_Dashboard_Professional`'s BFF, which issues one
refresh call per concurrent 401 (harmless for a low-concurrency admin tool, but worth
fixing here since a busy dashboard page can fire several parallel queries at once).

**Known limitation:** this dedup is per-Node-process. A horizontally scaled deployment
(multiple server instances behind a load balancer) would need a distributed lock (e.g.
Redis `SETNX`) to dedup across instances — not implemented in Phase 1. It is not a
correctness bug: refresh-token rotation tolerates being called more than once (each
instance just does its own rotation), it only costs an extra upstream call in the rare
cross-instance-race case. Flagged as a Phase 2 follow-up if traffic ever justifies it.

The backend rotates refresh tokens on every use (`ROTATE_REFRESH_TOKENS=True`,
`BLACKLIST_AFTER_ROTATION=True`) — every successful refresh call **must** persist the
newly returned refresh token, which `setAuthCookies()` does unconditionally.

## 5. CSRF protection

Classic double-submit cookie: `baraq_csrf` is a random 32-byte hex token, set on first
`GET /api/auth/csrf` call (the client's `apiClient` calls this lazily on the first
mutating request if the cookie isn't already present). Every mutating BFF/auth request
must echo it back as an `X-CSRF-Token` header; `validateMutationCsrf()` compares the two
and additionally checks the `Origin` header's host against the `Host` header, rejecting
cross-origin form-style submissions even if a token were somehow leaked.

GET requests are never CSRF-checked (they're not supposed to mutate state, and Django's
session/CSRF machinery is separately out of scope here since this API is pure JWT bearer
auth, not session-cookie auth, for the actual backend calls).

## 6. Route protection layers

1. **`src/proxy.ts`** (optimistic, cheap): redirects based on cookie *presence* only, no
   token verification, no backend call. Purely a UX nicety (don't show a protected page's
   skeleton for a split second before bouncing to `/login`).
2. **`app/api/bff/[...path]/route.ts`** (authoritative): the only code path that can
   reach the backend. No valid access token → no `Authorization` header → backend
   returns 401 → cookies cleared. This is where real enforcement happens, because it
   cannot be bypassed by hitting a Route Handler or Server Action directly (unlike the
   proxy's path-based matcher).
3. Client-side, `useCurrentUser()` / `useSession()` (`src/lib/auth/client.ts`) let a
   component react to an unauthenticated state (e.g. redirect from a client component
   that discovers its session died mid-session), but they are a UX layer on top of layer
   2, not a substitute for it.

## 7. Environment / secrets hygiene

- `src/config/env.ts` (server-only, guarded by the `server-only` package — importing it
  from a Client Component is a build-time error) validates every server env var with Zod
  at process start and throws immediately on a missing/malformed value — no silent
  fallback to a wrong default, especially not a fallback that could point at production.
- `src/config/env.public.ts` validates the small set of `NEXT_PUBLIC_*` values allowed to
  reach the browser. Nothing else is prefixed `NEXT_PUBLIC_` — grep the codebase for
  `NEXT_PUBLIC_` to verify the full list matches `.env.example`.
- `scripts/validate-env.mjs` is a dependency-free CI gate (`npm run validate:env`) that
  re-checks the same invariants (required vars present, `BACKEND_API_URL` HTTPS + not
  localhost in production, a preview/staging deploy never pointed at the production API
  host, no `NEXT_PUBLIC_*` variable whose name looks like it holds a secret).
- `next.config.ts` sets `poweredByHeader: false` and a security header set (CSP, HSTS in
  production, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`) ported
  from the pattern already validated in `Baraq_Dashboard_Professional`.

## 8. Known gaps / explicitly out of scope for Phase 1

- **Account deletion is implemented.** The settings flow calls authenticated
  `DELETE /users/me/` through the CSRF-protected BFF. A successful response clears
  the HttpOnly access and refresh cookies immediately. The backend soft-deletes and
  anonymizes the account and revokes its outstanding tokens.
- **No subscription checkout.** No payment provider is wired up on the backend
  (`PAYMENTS_ENABLED` exists as a flag with zero implementation behind it) —
  `featureFlags.subscriptionsCheckout` is likewise hard-coded `false`.
- **Cross-instance refresh dedup** — see §4.
- **CSP still uses `'unsafe-inline'` for script-src**, scoped to the theme-boot script
  only (see `next.config.ts` comment). A nonce-based CSP would remove this; deferred
  because it requires wiring a per-request nonce through the root layout, which is a
  small but real change better done as its own reviewed PR.

## 9. Phase 2 — live verification and fixes

Phase 2 stood up a real local Django instance and drove the **entire auth lifecycle**
through real HTTP, both directly and through the actual browser UI (see
`BACKEND_INTEGRATION_STATUS.md` for the full setup, which deliberately never touches the
production database credential found leaked in the backend's `.env` — see §10):

- Login (success + `401` on invalid credentials, correct localized error body).
- `users/me` with the resulting access token.
- Refresh — confirmed real rotation (new refresh token differs from the old one on every
  call).
- **Reuse of an already-rotated (blacklisted) refresh token correctly rejected with
  `401`** — confirms `ROTATE_REFRESH_TOKENS`/`BLACKLIST_AFTER_ROTATION` are genuinely
  enforced server-side, not just documented.
- Logout (`204`), then confirmed the just-logged-out refresh token is rejected (`401`) on
  a subsequent refresh attempt — real revocation, not just cookie-clearing on the client.
- A real authenticated browser session (cookies genuinely set by the BFF) navigating the
  authenticated app shell.

Concurrent-refresh behavior (§4's single-flight mutex) was **not** re-tested with actual
parallel requests this phase — the code path is unchanged from Phase 1 and its logic was
re-read and still looks correct (an in-flight promise is memoized and shared), but a
concurrency test (firing several 401-triggering requests at once and confirming only one
upstream refresh call happens) remains a good Phase 3 addition.

### Real bugs found and fixed this phase

1. **Open redirect via `?next=`.** The login page's post-login redirect only checked
   `next.startsWith("/")`, which does **not** reject `//evil.com` or `/\evil.com` —
   both start with a single `/` but are protocol-relative URLs a browser can navigate to
   a different origin. Fixed with a proper `isSafeRedirectPath()` helper
   (`src/lib/utils/safe-redirect.ts`, unit-tested in `tests/unit/safe-redirect.test.ts`)
   that also rejects any string containing `://`.
2. **Three separate React 19 hydration mismatches**, all the same underlying mistake —
   reading a browser API directly in a component's render body (or a `useState`
   initializer, which runs during render too) instead of through
   `useSyncExternalStore`, which React documents specifically for "value differs between
   server and client, sourced from an external system":
   - `OfflineBanner` read `navigator.onLine` in its `useState` initializer. This
     environment's browser automation reports `navigator.onLine === false`, while the
     server (no `navigator`) always implies "online" — a genuine structural mismatch
     (an extra banner `<div>` client-side the server never rendered), not just a
     same-content attribute warning.
   - `ThemeToggle` read the zustand-persisted theme preference before confirming
     hydration had actually finished (`persist` rehydrates from `localStorage`
     synchronously on the client, before React's first client render, so the *server*
     render — no `localStorage` — always assumed `"system"` while the client's first
     render already knew the real, persisted preference).
   - `Logo` had the same issue via `window.matchMedia("(prefers-color-scheme: dark)")`,
     read unconditionally to resolve the `"system"` preference to light/dark art.
   All three are now driven by `useSyncExternalStore` with an explicit server snapshot
   (`useHasHydratedThemeStore()` in `stores/theme-store.ts`, `usePrefersDarkColorScheme()`
   in `components/brand/Logo.tsx`, and the inline hook in `OfflineBanner.tsx`) — confirmed
   fixed by reloading and finding zero hydration warnings in the browser console
   afterward, not just by code inspection.
3. **`ThemeScript`'s inline boot script itself was contributing to hydration
   instability** — a hand-written `<script>` tag placed directly in `<head>` isn't one of
   the prop shapes React 19 auto-hoists as page metadata, so server and client could
   disagree about its position in the tree. Replaced with `next/script`'s
   `strategy="beforeInteractive"`, Next's own documented mechanism for exactly this
   "must run before hydration" case.

None of the three hydration bugs were reachable from a plain content diff — they only
showed up once a live backend made it possible to actually log in and browse the
authenticated app shell (the public `/login` page alone never renders `ThemeToggle`), which
is itself a small piece of evidence for why Phase 2's "stand up a real backend and actually
click through it" approach matters beyond satisfying a checklist.

## 10. Disclosure: a live secret was found in the backend repo

`Baraaq_back/backend/.env` contains a **production PostgreSQL connection string with a
real password**, sitting in plaintext, with the file's own comment reading *"ROTATE THIS:
this is a live production password that was sitting in this file. See chat for rotation
steps."* This is not something Phase 2 introduced or could remediate from the web
repository — it's called out here so it isn't missed. It was never read, used, logged, or
transmitted anywhere by this phase's work; the local backend instance used for live
verification (§9, `BACKEND_INTEGRATION_STATUS.md`) uses a throwaway SQLite database and
OS-level environment variables that take precedence over that `.env` file, specifically so
this credential is never touched. **Action needed from whoever owns backend deployment:
rotate this credential and remove it from the file.**

## 11. Phase 2.5 update: two new auth bugs found and fixed, credential status re-confirmed

Phase 2.5's brief specifically required re-exercising the open-redirect protection
(§ above, `isSafeRedirectPath`) with the exact adversarial inputs it names, end to end
through a live login. Doing that surfaced two real bugs neither of which is a security
regression in `isSafeRedirectPath` itself — both are in what happens *after* it approves a
value:

1. **Double-locale-prefix redirect on a legitimate `?next=`.** Logging in with
   `?next=/ar/study-plans` (exactly the value `src/proxy.ts` sets when redirecting an
   unauthenticated visitor away from a protected page) landed on `/ar/ar/study-plans` — a
   real 404 — because the locale-aware router from `@/i18n/navigation` re-prepends the
   locale onto a path that's already locale-prefixed. `isSafeRedirectPath` correctly
   allowed the value through; the bug was one layer further down, in how the approved path
   was then navigated to. Fixed in `src/app/[locale]/(auth)/login/page.tsx` by using the
   native Next.js router (`next/navigation`'s `useRouter`) for this one redirect only,
   keeping the locale-aware router/`Link` for every other in-page navigation. Confirmed
   live: `?next=/ar/study-plans` now lands on `/ar/study-plans` and renders the real page;
   the brief's own adversarial cases (`?next=//example.com`, `?next=https://example.com`)
   still correctly fall back to `/ar`.
2. **Missing post-logout redirect.** `useLogout`'s `onSuccess` revoked the refresh token
   server-side and cleared the query cache, but never navigated — a user stayed on the
   now-stale protected page they logged out from until their *next* navigation happened to
   trigger the proxy's login redirect (confirming the session really was gone server-side;
   this was a UX gap, not a session-termination bug). Fixed by adding
   `router.replace("/login")` to the settings page's logout confirmation handler.

Both fixes are covered by new Playwright regression tests in `tests/e2e/smoke.spec.ts`
(`authenticated flows` suite — gated behind `E2E_BACKEND_AVAILABLE` so they skip cleanly
without a live backend rather than reporting false failures).

**Credential re-check.** Re-confirmed this phase, without printing, copying, or connecting
with the value: `git ls-files --error-unmatch .env` fails (not tracked by Git),
`git log --all -- .env` returns nothing (never committed), `git check-ignore -v .env` shows
it's matched by `.gitignore:1:.env`. Status: **UNTRACKED**. `.env.example` — the only
env-like file actually tracked by Git — was re-inspected by checking value lengths and
prefixes only (never printing a full secret) and contains exclusively placeholder text
(e.g. `SECRET_KEY`/`POSTGRES_PASSWORD` both start with `"replace-wi..."`). No new secret
exposure was found. The rotation action item from §10 stands: it is an infrastructure
action outside this repository's scope, and does not block Phase 3 *development* — it does
block a production *deployment* of either the backend or this web app until confirmed done.

## 12. Phase 3: response caching and body-size limit closed

A blueprint compliance audit (against `04_WEB_APP.md` §9) flagged two §9 requirements this
doc had never explicitly addressed, neither of which had any code behind them:

1. **No explicit `Cache-Control: no-store`** on any `/api/bff/*` or `/api/auth/*` response —
   relying only on Next.js's implicit dynamic-rendering behavior (triggered by `cookies()`
   usage) is not a documented, generic guarantee, especially under `output: "standalone"`
   (self-hosted Node, not Vercel's edge cache with its own defaults). Fixed: every response
   from the BFF proxy (`src/app/api/bff/[...path]/route.ts`) and the four dedicated auth
   routes (`login`, `logout`, `session`, `csrf`) now sets `Cache-Control: no-store,
   must-revalidate` via a shared `NO_STORE_HEADERS` constant (`src/lib/http/no-store.ts`).
2. **No request body size cap in the BFF proxy** — `request.arrayBuffer()` was called
   unconditionally with nothing rejecting an oversized upload before/while it buffered in
   memory. Fixed: `handle()` now rejects with `413 payload_too_large` both on a declared
   `Content-Length` over the limit (cheap, rejects before reading the body) and on the
   actual buffered size (catches a missing/lying `Content-Length`). The limit is
   `BFF_MAX_BODY_BYTES` (`src/config/env.ts`, default 55MB — headroom above
   the 50MB source ceiling for multipart overhead), documented in `.env.example`.

## 13. Native autofill and form-state integrity

Browser and password-manager autofill can update a control's visible DOM value without
emitting the `input`/`change` event observed by React Hook Form. In that case the user sees
an email or password while RHF still validates its previous empty value. Credential and
identity forms now call `syncNativeTextValues()` immediately before RHF validation, using
the submitted form's native `FormData` as the final source of truth for text controls.
This does not bypass Zod or backend validation; it only guarantees that the value validated
and sent is the value visibly submitted by the browser.

`tests/unit/registration-autofill.test.tsx` reproduces silent autofill without dispatching
an input event and asserts that the exact visible email reaches the registration mutation.
The generic BFF transport tests additionally assert byte-for-byte JSON preservation for
representative `POST`, `PUT`, and `PATCH` requests.

The locale root previously preloaded every file generated by four multi-weight font
families (Arabic and Latin) on every route. That produced eleven font preloads on an
Arabic auth page even though the Latin families were not used. All families remain
self-hosted with `display: "swap"`, but their automatic preload is disabled; the browser
now discovers only the font faces required by the active locale. Above-the-fold auth
images retain intentional Next Image priority.

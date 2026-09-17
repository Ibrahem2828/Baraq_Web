# Phase 1 Report — Baraq Web

> Historical snapshot. The account-deletion backend gap recorded below was closed
> after this report; see `AUTH_SECURITY.md` and `FEATURE_PARITY_MATRIX.md` for the
> current release behavior.

Date: 2026-09-10. Scope: everything in the Phase 1 brief — audit, architecture, design
system, i18n, auth, API layer, core components, app shell, route skeleton with working
feature UIs, tests, docs. No backend instance was available to run against during this
phase (see "Verification" below for what that does and doesn't mean).

## 1. What was implemented

- **Audit** of `Baraq-App` (mobile, Expo/RN), the real Django backend at
  `Baraaq_back/backend`, the `Baraq_AI` FastAPI service (internal-only, HMAC, not a
  frontend target), the existing `Baraq_Dashboard_Professional` Next.js app (BFF/cookie
  pattern prior art), and `Baraq_Website` (brand tokens). See "Discovered inconsistencies"
  below for what this changed about the plan.
- **Next.js 16.3.4 App Router** project at `web/`, TypeScript strict, Tailwind CSS v4,
  Turbopack (default in this version). React 19.2.8.
- **i18n**: next-intl, `ar` (default, RTL) / `en` (LTR), `[locale]` route segment,
  `src/messages/{ar,en}.json` (354 lines each, full parity — every string used in the app
  exists in both files, verified by the app typechecking and rendering correctly in both
  locales).
- **Design system**: `src/design-system/tokens.css` — light/dark values ported verbatim
  from `Baraq_Website/css/style.css`'s `:root` block (sampled by the brand team from real
  character art, not invented); a **fire** theme ported from the mobile app's
  `src/theme/themes.ts` (doesn't exist on the marketing site). No-flash theme boot via a
  static inline script (`ThemeScript.tsx`) + Zustand-persisted preference
  (`stores/theme-store.ts`). All three themes verified rendering in-browser (see
  Verification).
- **Auth**: BFF pattern — `app/api/bff/[...path]/route.ts` is the only code path that ever
  calls the Django backend; access/refresh tokens live only in HttpOnly, Secure (env-gated),
  SameSite=Lax cookies (`src/lib/auth/cookies.ts`); double-submit CSRF
  (`src/lib/auth/server.ts`); single-flight refresh mutex closing a gap found in the
  existing dashboard's equivalent code; `src/proxy.ts` (Next 16's `middleware.ts` rename)
  does optimistic cookie-presence redirects only, with real authorization enforced per
  request in the BFF. Full rationale in `docs/AUTH_SECURITY.md`.
- **API layer**: `src/lib/api/{backend,client,envelope,errors,endpoints}.ts` — typed
  client, centralized endpoint constants (no stringly-typed routes in components),
  envelope/pagination normalization matching the Django response shape exactly (`{success,
  message, data, meta, request_id}`, `meta.count/next/previous` — not DRF's raw
  `results` key), `AppError` normalization ported from mobile's `errorNormalizer.ts`
  philosophy. `src/lib/query/` — TanStack Query client + a hierarchical query-key registry
  per feature, mirroring mobile's key conventions.
- **Environment validation**: Zod schema (`src/config/env.ts`, server-only;
  `src/config/env.public.ts`, client-safe) plus a dependency-free CI gate
  (`scripts/validate-env.mjs`) that also greps for anything `NEXT_PUBLIC_`-prefixed that
  looks like a secret.
- **Core UI components** (`src/components/ui/`): Button, IconButton, Input, PasswordInput,
  Select, Textarea, Card, Badge, Chip, Avatar, Divider, Progress, Modal, Drawer, Tooltip,
  Dropdown, Tabs, Skeleton, PageHeader, SectionHeader, ConfirmationDialog — built on Radix
  primitives where real accessibility value exists (Dialog, DropdownMenu, Tabs, Tooltip,
  Avatar, Progress), styled with the token system, RTL-correct via CSS logical properties.
  Feedback components (`components/feedback/`): EmptyState, ErrorState, LoadingState,
  OfflineBanner, Toast. Motion helpers (`components/motion/`): FadeIn/StaggerIn variants
  wrapping Motion for React, `useReducedMotion` respecting `prefers-reduced-motion`.
- **App shell**: `components/layout/` — AppShell, Sidebar (desktop), Topbar, MobileNav
  (compact/touch), LocaleSwitcher, ThemeToggle — responsive across desktop/tablet/mobile
  without layout shift.
- **Full route skeleton** — every mobile screen has a corresponding route (see
  `docs/FEATURE_PARITY_MATRIX.md` for the complete mapping), and the large majority are not
  skeletons at all but working feature UIs wired to the real, typed API client: file
  upload with client-side validation, the full quiz attempt flow (start → answer → submit →
  graded result), study plan task management, project archive/restore, support ticket
  threads, subscription usage display, settings/profile/subjects management, etc.
- **Tests**: Vitest + Testing Library, 10 files / 39 tests (character config, cookie
  helpers, endpoint builders, envelope/pagination normalization, error mapping, validation
  schemas, `cn()` util, `Button`/`EmptyState` components). Playwright smoke spec
  (`tests/e2e/smoke.spec.ts`) covering locale redirect, RTL/LTR `dir` attribute, protected
  route redirect, and login form rendering in both locales — written but not executable in
  this sandbox (see Verification).
- **Docs**: this file, plus `WEB_ARCHITECTURE.md`, `FEATURE_PARITY_MATRIX.md`,
  `API_CONTRACT_MAP.md`, `DESIGN_SYSTEM.md`, `AUTH_SECURITY.md` in `web/docs/`, and
  `WEB_FEATURE_PARITY_MATRIX.md` / `WEB_API_CONTRACT_MAP.md` at the repo root
  (`D:\baraaq\docs\`).

### Fixed during verification (this session)

`next.config.ts` sets `output: "standalone"` (matching the existing dashboard's Docker
deployment approach), but the scaffolded `"start": "next start"` script does not work with
that output mode — Next.js itself warns and refuses. Rewrote `scripts/run-start.mjs` to
copy `public/` and `.next/static/` next to the standalone `server.js` (as a production
Dockerfile's final layer would) and run that directly; `npm run start` now serves the real
production build correctly. Verified: built, started on a scratch port, `GET /ar/login`
returned `200` with the expected Arabic content.

## 2. Commands run and exact results

```
$ npm run typecheck   → tsc --noEmit                          PASS (no output = no errors)
$ npm run lint        → eslint .                               PASS (no output = no errors)
$ npm run test        → vitest run
    Test Files  10 passed (10)
    Tests       39 passed (39)
    Duration    26.39s (first run) / 2.08s (warm, with --coverage)
$ npm run test:coverage
    Statements 66.66% | Branches 83.75% | Functions 44.28% | Lines 65.21%
    (concentrated in lib/api, lib/validation, config — the modules with the highest
    correctness risk; UI components and page-level code are covered by
    typecheck+lint+manual browser verification rather than unit tests in Phase 1)
$ npm run build       → next build (Turbopack)
    Compiled successfully in 4.7s; TypeScript finished in 4.9s; 57 pages generated
    (ar/en × every static route) + dynamic routes for every [id]/[character]/[...path]
    segment; 0 errors, 0 warnings other than the pre-existing informational
    "next start does not work with output: standalone" notice (now moot — see above)
$ npm run start (after the fix above)
    Started on a scratch port; GET /ar/login → 200, body contains "تسجيل الدخول"
```

`npm run test:e2e` (Playwright) could not run in this sandbox: `npx playwright install
chromium` failed — outbound requests to `cdn.playwright.dev` timed out (network egress in
this environment is restricted to an allowlist that doesn't include Playwright's browser
CDN). The four smoke-test scenarios it would have checked were verified manually instead,
using the Browser-pane tool against the real dev server:

- `GET /` → redirects to `/en/login` when the browser reports `en-US` (next-intl's Accept-
  Language negotiation — correct i18n behavior, not a bug: `/ar` is the *default* locale
  when there's no signal, not a forced override of the visitor's actual language)
- `GET /ar/login` → `<html lang="ar" dir="rtl">`, form fully mirrored, Arabic labels
  ("البريد الإلكتروني", "كلمة المرور", "دخول") — screenshot-verified
- `GET /en/login` → `<html lang="en" dir="ltr">`, English labels ("Email", "Password",
  "Sign in") — screenshot-verified
- Visiting `/ar/library` unauthenticated → redirected to `/ar/login?next=%2Far%2Flibrary`
  by `src/proxy.ts` — confirmed via console/network inspection
- Theme system: set `light`/`fire` via the real persistence path (`localStorage`
  `baraq_theme` key + reload, exactly what `ThemeToggle` does) — both rendered correctly,
  screenshots captured; `fire` in particular confirms the ported mobile palette (`#1a0f0a`
  background, `#ff6b2c` accent) applies correctly through the same token system as
  light/dark
- Browser console: no errors on any of the above

## 3. Dependency choices (why each one)

| Package | Version | Why |
|---|---|---|
| next, react, react-dom | 16.3.4, 19.2.8 | Latest stable at scaffold time — current Active LTS-equivalent for the Next.js ecosystem (Next doesn't version LTS the way Node does; "latest stable, security-patched" is the correct target) |
| @tanstack/react-query | 5.x | Exact parity with mobile's server-state layer; mobile already proved this pattern works for this API |
| zustand | 5.x | Mobile already uses it for **exactly** one thing (theme preference + persistence) — kept to that same minimal scope here, not a general app-state store |
| react-hook-form + zod + @hookform/resolvers | current | Exact parity with mobile's form/validation stack |
| next-intl | 4.x | Most mature App-Router-native i18n solution; mobile has **no** i18n library (hardcoded Arabic + forced RTL) so this is a deliberate upgrade, not a port — the brief requires the web app to support both locales architecturally |
| motion (Motion for React) | 13.x | Successor to Framer Motion; mobile's `react-native-reanimated`-based motion presets (fade/slide/scale/stagger) map directly onto it |
| Radix UI primitives (dialog, dropdown-menu, tabs, tooltip, avatar, progress, slot, visually-hidden) | 1.x/2.x | Real accessibility value (focus trapping, keyboard nav, ARIA) for the specific components that need it — not a full UI kit; everything else in `components/ui` is custom, matching the brief's "no giant UI frameworks" and the existing dashboard's precedent for a bespoke visual identity |
| lucide-react | 1.x | Lightweight, tree-shakeable icon set; mobile uses `@expo/vector-icons` which has no web equivalent |
| clsx, tailwind-merge, class-variance-authority | current | Standard, minimal class-composition utilities — avoids ad-hoc string concatenation bugs in component variants |
| server-only | 0.0.1 | Build-time guarantee that backend-URL/cookie-secret code never reaches the client bundle — same package the existing dashboard already uses |
| Vitest + Testing Library + jsdom | 5.x / 16.x / 30.x | Fastest compatible unit-test runner for a Vite-adjacent Next toolchain; RTL for component behavior over implementation details |
| @playwright/test | 1.63 | Only realistic cross-browser e2e option; written and ready even though it couldn't execute in this sandbox |
| Prettier + prettier-plugin-tailwindcss | current | Deterministic formatting and class-order sorting; doesn't conflict with the ESLint flat config already in place |

**Not added, deliberately**: no CSS-in-JS runtime, no full component-kit (shadcn was
considered but the existing dashboard's precedent plus the brief's "visual identity must
remain custom" pointed toward bespoke components on Radix primitives instead), no
analytics/telemetry SDK (mobile has none configured either — "no provider configured yet"
is the honest state on both platforms, and adding one without the mobile app's PII-redaction
discipline would be a regression, not a feature).

## 4. Architectural decisions

- **BFF over direct browser→backend calls.** The Django backend's `CORS_ALLOWED_ORIGINS`
  does not include this app's origin today, so direct calls aren't possible regardless —
  but even if they were, keeping both tokens server-side by default is the safer choice
  for a new app with no established CORS relationship yet. Full writeup:
  `docs/AUTH_SECURITY.md`.
- **`src/proxy.ts`, not `middleware.ts`.** Next.js 16 renamed and Node-runtime-restricted
  this file; using the old name would silently keep working via the deprecated shim but
  starting a new project on it would be wrong. Confirmed by reading the framework's own
  bundled docs (`node_modules/next/dist/docs/`) before writing any routing code, per
  `AGENTS.md`'s instruction that this Next.js version has breaking changes from training
  data.
- **No `cacheComponents`/`"use cache"`.** Next 16's new caching paradigm is a real
  architectural commitment (dynamic-by-default + explicit cache opt-in, `<Activity>`-based
  navigation state) that this app doesn't need yet — everything here is either
  user-specific (must stay dynamic) or a public marketing-adjacent page (plain `fetch`
  caching is sufficient). Revisit in Phase 2 if static-content pages are added.
- **Character "coming soon" gating lives on `CharacterDefinition.isLive`**, not only on
  the `NEXT_PUBLIC_FEATURE_*` env flags — mirrors the mobile app's actual current rollout
  state (Kholasa/Sada are backend-capable but mobile itself ships them as coming-soon), so
  the web app doesn't accidentally launch ahead of mobile without a product decision to do
  so.
- **Canonical character names resolved, not inherited.** `src/config/characters.ts` is the
  single source of truth; the mobile app's internal "رفيق"/"رشيد" inconsistency for the
  Rasheed character is documented (`RASHEED_LEGACY_DISPLAY_NAME_DISCREPANCY`) but not
  propagated. See `FEATURE_PARITY_MATRIX.md`.

## 5. Discovered mobile/backend inconsistencies

1. **Backend identity.** The task framing pointed at `Baraq_AI` (FastAPI) as "the backend."
   It is not — it's an internal AI microservice reached only by the Django backend over
   HMAC-signed requests (confirmed in its own source: `app/core/config.py` states "Django
   is the only public-facing identity and authorization authority"). The real
   consumer-facing API is the Django app at `Baraaq_back/backend` (`api.baraqapp.com`).
   Corrected before any code was written against the wrong contract.
2. **Character naming** — "رفيق" vs "رشيد" for Rasheed, detailed above and in the parity
   matrix.
3. **`frontend_api_contract.json`/`frontend_api_contract_summary.md`** (in the backend
   repo) reference a stale host (`api.barraq.xn--mgbaab0cxheq.tech`); the real production
   host per `docker-compose.yaml`/`.env` is `api.baraqapp.com`. Trusted the deployment
   config over the doc file.
4. **No account-deletion endpoint** exists on the backend at all (not a web gap — mobile's
   own account-deletion screen is wired to a permanently-throwing stub adapter and isn't
   even registered in mobile's navigator).
5. **No payment/checkout integration** exists on the backend (`PAYMENTS_ENABLED` is a flag
   with nothing behind it) — neither platform can self-serve a plan upgrade today.
6. **`FRONTEND_PASSWORD_RESET_URL`** on the backend defaults to a mobile deep-link scheme
   (`baraq://reset-password`) — needs a web-specific override once this app is deployed, or
   the backend needs a locale/platform-aware value. Documented in `.env.example`.

## 6. Remaining blockers

- **No live backend to integration-test against.** Everything above the HTTP layer
  (envelope shape, error codes, enums, pagination) is verified against the Django source
  code directly (three independent audit passes cross-checked route-by-route), not against
  live responses. Recommend a smoke-test pass against a real backend instance before this
  app leaves Phase 1/enters staging.
- **CORS**: the backend's `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` need this app's
  deployed origin added (irrelevant for the BFF's server-to-server calls, but relevant if
  any future direct-browser call is ever added).
- **Playwright e2e** could not execute in this sandbox (browser download blocked by network
  egress policy) — will run in any environment with normal internet access or a
  pre-provisioned browser cache/Docker image.
- **Account deletion & subscription checkout** remain `BLOCKED_BY_BACKEND` — see §5.
- **Today/Week study-plan and standalone task-detail routes** are data-complete
  (`studyPlansApi.ts` exposes `today()`/`week()`) but not yet split into their own pages —
  flagged as `PARTIAL` in the parity matrix, low effort to close in Phase 2.
- Unit test coverage (66.6% statements) is concentrated on the highest-risk, hardest-to-
  visually-verify modules (API/error/envelope/validation logic) rather than spread evenly —
  component/page coverage relies on typecheck + lint + manual browser verification for
  Phase 1; broadening automated coverage (especially once Playwright can run) is a
  reasonable Phase 2 task.

## 7. Phase 2 entry point

1. Stand up a real Django backend instance (or point `BACKEND_API_URL` at a shared dev
   instance) and re-run the full manual QA pass from `Baraq-App/TEST_PLAN.md` against this
   app to catch any envelope/enum drift between the source-code audit and live behavior.
2. Add this app's origin to the backend's `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` (even
   though the BFF doesn't strictly need it, it removes a foot-gun for any future direct call).
3. Run `npx playwright install chromium && npm run test:e2e` in an environment with normal
   network access; expand the smoke suite to cover authenticated flows once a test account
   exists on the target backend.
4. Close the two `PARTIAL` items (today/week routes, standalone task detail).
5. Revisit `featureFlags.kholasa`/`sada` and `CHARACTERS.{kholasa,sada}.isLive` together with
   product once the backend/mobile teams confirm a launch date for those two characters.
6. Decide and implement the account-deletion and subscription-checkout contracts with the
   backend team, then build the corresponding UI (currently correctly absent).
7. `docs/AUTH_SECURITY.md` flags the single-flight refresh mutex as process-local only;
   if this app is deployed with more than one server instance, add a distributed lock
   (e.g. Redis `SETNX`) — not required for correctness today, only for efficiency under
   horizontal scaling.

**Phase 2 readiness: see the top-level engineering report's percentage — this document is
the detailed backing for that number.**

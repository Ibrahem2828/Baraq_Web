# Baraq Web — Architecture

Phase 1 architecture reference for the Baraq consumer web application at `/web`. This
document describes what the codebase actually does, not aspirational future state.

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), Turbopack (default bundler) | Server Components by default, Route Handlers double as a secure BFF, first-class i18n routing |
| UI runtime | React 19.2 | Ships with Next 16; `use()` hook used for unwrapping async route params in Client Components |
| Language | TypeScript 5, `strict: true` | Non-negotiable for a codebase this size |
| Styling | Tailwind CSS 4 (`@import "tailwindcss"`, no `tailwind.config.js`) | Utility-first, CSS-variable-driven theming maps cleanly onto our design tokens |
| Server state | TanStack Query v5 | Caching, invalidation, polling (AI jobs) — mirrors the mobile app's React Query usage almost 1:1 |
| Client state | Zustand (`src/stores/theme-store.ts`) | Used for exactly one thing: theme preference. Everything else is server state (TanStack Query) or local component state — no Redux-style global store |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) | Matches the mobile app's `react-hook-form` + `zod` convention exactly |
| i18n | `next-intl` | Mature App Router support, typed messages, locale-aware routing via `src/i18n/routing.ts` |
| Motion | `motion` (the successor to Framer Motion) | Used only where orchestration matters (staggered lists, entrance transitions); everything else is plain CSS transitions |
| Accessible primitives | Radix UI (`Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`, `Avatar`, `Progress`, `VisuallyHidden`) | Keyboard nav, focus trapping, and ARIA wiring for free instead of hand-rolled |
| Icons | `lucide-react` | Tree-shakeable, consistent stroke style |
| Testing | Vitest + React Testing Library (unit/component), Playwright (e2e) | Standard, fast, good TS support |

Every dependency above earns its place for a specific reason stated in the table — see
`PHASE_1_REPORT.md` §"Dependency choices" for the full reasoning, including libraries we
deliberately did **not** add (a full UI kit, a generic state manager, a generic HTTP client
beyond `fetch`).

## 2. Folder architecture

```
web/
  src/
    app/                        # Next.js App Router routes
      [locale]/                 # ar | en — all user-facing routes are locale-scoped
        (auth)/                 # public: login, register, forgot/reset password
        (app)/                  # protected: everything behind the app shell
        layout.tsx               # the de-facto ROOT layout (renders <html>/<body>) — see §4
        not-found.tsx
      api/
        auth/{login,logout,session,csrf}/route.ts   # dedicated auth Route Handlers
        bff/[...path]/route.ts                       # the generic backend proxy
      global-error.tsx           # true root error boundary (outside [locale])
    components/
      ui/                        # Button, Input, Card, Modal, Tabs, ... (framework-agnostic primitives)
      layout/                    # AppShell, Sidebar, Topbar, MobileNav, nav-items.ts
      feedback/                  # EmptyState, ErrorState, LoadingState, OfflineBanner, Toast
      motion/                    # FadeIn/StaggerIn + shared variants + useReducedMotion
      brand/                     # Logo, CharacterAvatar, CharacterCard
    features/                    # one folder per domain — api + hooks (+ components when needed)
      auth/ ai-jobs/ characters/ notifications/ study-plans/ quizzes/
      sources/ projects/ results/ subscriptions/ support/ subjects/ students/ profile/
    lib/
      api/                       # endpoints.ts, client.ts, backend.ts, envelope.ts, errors.ts
      auth/                      # cookies.ts, server.ts, client.ts
      query/                     # query-client.ts, keys.ts
      validation/                # zod schemas shared across forms
      utils/                     # cn(), request-id, cookie reader
    i18n/                        # routing.ts, navigation.ts, request.ts — next-intl config.
                                  # Deliberately a top-level sibling of lib/, not lib/i18n/:
                                  # next-intl's App Router convention expects next.config.ts
                                  # and proxy.ts to import a plugin entry point at a stable,
                                  # predictable path, and every official example places it
                                  # at src/i18n/. Nothing else in the app imports next-intl
                                  # internals directly, so this doesn't fragment the "lib/"
                                  # convention in practice — see src/lib/auth/client.ts etc.
                                  # for how normal feature code still only touches lib/.
    config/                      # env.ts (server), env.public.ts (client), characters.ts,
                                  # feature-flags.ts, constants.ts
    design-system/               # tokens.css, fonts.ts, ThemeScript.tsx
    stores/                      # theme-store.ts (the one Zustand store)
    types/                       # domain.ts (shared API resource types)
    messages/                    # ar.json, en.json (next-intl message catalogs)
    proxy.ts                     # Next.js 16 middleware-equivalent (see §5)
  tests/
    unit/                        # Vitest + RTL
    e2e/                         # Playwright
    mocks/
  docs/                          # this file and its siblings
  public/assets/                 # future asset layout (characters/, logos/, ... — see DESIGN_SYSTEM.md)
```

**Why this shape, not `src/app` co-located with feature code:** Next.js App Router routes
must live under `app/`, but route files here are intentionally thin — a page imports a
feature's hook(s) and a view component, nothing else. All actual logic (API calls, query
hooks, validation, non-trivial presentational components) lives in `features/<domain>/`,
so a feature's code is browsable in one place regardless of how many routes reference it.
This avoids the two failure modes we were explicitly steering away from: (a) one giant
`components/` folder with no domain boundaries, and (b) business logic smeared across
route files, which would make the App Router's file-system routing double as an
accidental architecture.

**Dependency direction / avoiding cycles:** `app/**` depends on `features/**` and
`components/**`; `features/**` depends on `lib/**`, `config/**`, and `components/**`;
`lib/**` and `config/**` depend on nothing above them. Nothing under `lib/` or `config/`
imports from `features/` or `app/`. `components/ui`, `components/feedback`,
`components/motion`, and `components/brand` do not depend on `features/**` either — they
take data via props, not via hooks that reach into a specific feature.

## 3. API / data layer

### 3.1 Route contract

`src/lib/api/endpoints.ts` is the single source of truth for every backend path. No
component or feature module ever writes a URL string literally — see
`docs/API_CONTRACT_MAP.md` for the full route table this file encodes.

### 3.2 Request flow

```
Client Component
  → features/<x>/hooks/useX.ts        (TanStack Query)
    → features/<x>/api/xApi.ts        (typed function)
      → lib/api/client.ts  apiClient   ("use client" fetch wrapper)
        → fetch("/api/bff/<path>")     (same-origin, CSRF header attached)
          → app/api/bff/[...path]/route.ts   (Route Handler, Node.js runtime)
            → lib/api/backend.ts  backendFetch()   (server-only fetch)
              → BACKEND_API_URL (Django)
```

The browser **never** calls the Django backend directly. See `docs/AUTH_SECURITY.md` for
why (short version: the backend's CORS allowlist doesn't include this app's origin yet,
and keeping tokens server-side is the safer default regardless).

### 3.3 Response shape

Every backend response is wrapped in a stable envelope:
`{ success, message, data, meta?, request_id }` on success,
`{ success: false, message, code, errors, request_id }` on error. `src/lib/api/envelope.ts`
and `src/lib/api/errors.ts` normalize both shapes into `T` (unwrapped data) or a thrown
`ApiError` with a small, UI-friendly `code` enum (`NETWORK`, `VALIDATION`, `UNAUTHORIZED`,
`SUBSCRIPTION_LIMIT`, ...). Every `ApiError.code` maps to a translated message via the
`errors.*` i18n namespace — there are no hardcoded error strings in component code.

### 3.4 Query keys & invalidation

`src/lib/query/keys.ts` centralizes every query key as a small factory function per
domain (`queryKeys.studyPlans.detail(id)`, etc.), mirroring the mobile app's
`xQueryKeys` convention. Mutations invalidate the narrowest key that covers what changed
(e.g. completing a study task invalidates `studyPlans.today()` and the `studyPlans.all`
family, not the entire cache).

## 4. Rendering strategy

- Server Components are the default. `"use client"` is added only where a component needs
  interactivity, browser APIs, or a React hook that requires it (forms, TanStack Query
  hooks, Radix primitives, motion).
- `src/app/[locale]/layout.tsx` is the de-facto root layout (there is deliberately no
  `src/app/layout.tsx` — see the next-intl App Router convention): it renders `<html
  lang dir>`, resolves the locale, and is the only place `NextIntlClientProvider` and the
  TanStack Query `Providers` wrapper mount.
- `src/app/global-error.tsx` sits outside `[locale]/` entirely, per the Next.js
  requirement that the true root error boundary render its own `<html>/<body>` and not
  depend on any layout that might itself be the thing that failed.
- No `cacheComponents`/`"use cache"` (Next 16's new caching paradigm) is used in Phase 1
  — this app is almost entirely per-user, dynamic data (auth-gated), so the standard
  "dynamic by default" fetch behavior is already the correct behavior. Revisit only if a
  genuinely public, cacheable route (e.g. a marketing/pricing page) is added later.

## 5. Routing & route protection

- `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`; Node.js runtime only)
  does two things in order: (1) next-intl locale routing/redirect, (2) an **optimistic**
  cookie-presence check that redirects unauthenticated users away from protected routes
  and authenticated users away from the auth pages.
- This is explicitly *not* the real security boundary — a proxy check can be bypassed by
  a direct fetch to a Route Handler or a Server Action. The actual authorization boundary
  is `app/api/bff/[...path]/route.ts`, which is the only code path that can reach the
  backend, and which fails closed (no access token → no `Authorization` header → backend
  returns 401 → BFF clears cookies).
- Route groups: `(auth)` for the four public auth pages, `(app)` for everything else,
  wrapping children in `AppShell` (desktop sidebar + topbar, mobile topbar + bottom tab
  bar, no layout shift between breakpoints since both nav surfaces are always in the DOM).

## 6. Internationalization

See `docs/DESIGN_SYSTEM.md` §"RTL/LTR" for the CSS side. On the routing side: `ar` is the
default and canonical locale (`localePrefix: "always"`, so URLs are always
`/ar/...`/`/en/...`, never bare), Arabic renders `dir="rtl"`, English `dir="ltr"`. Message
catalogs live at `src/messages/{ar,en}.json`; Phase 1 ships representative coverage for
every namespace a built page actually uses (see `FEATURE_PARITY_MATRIX.md` for which pages
that is) — not a full professional translation pass, which is a content task, not an
architecture task.

## 7. What Phase 1 deliberately does not do

- Does not implement `cacheComponents`/Partial Prerendering (see §4).
- Does not implement subscription checkout (no payment provider exists on the backend —
  see `docs/WEB_API_CONTRACT_MAP.md` §"Subscriptions").
- Implements account deletion through authenticated `DELETE /users/me/`; the BFF
  clears its HttpOnly authentication cookies after a successful deletion.
- Does not fully implement every feature page's business logic end-to-end — some pages
  (noted per-page in `FEATURE_PARITY_MATRIX.md`) are foundation-ready scaffolds with
  working data-fetching and the correct loading/empty/error states, pending a full pass
  once subject/source pickers and richer AI-job composition UI are built out.

## 8. Phase 2 additions

- **Static asset architecture**: `src/assets/` holds the real Baraq brand/character art as
  ES-module imports (`src/assets/assets.ts`), not string paths into `public/` — Next.js
  gives statically-imported images automatic width/height inference and build-time
  optimization this way. See `docs/ASSET_INVENTORY.md` for what's actually wired versus
  what's present-but-not-usable (a real content gap, not a wiring gap, in several
  "empty state" images).
- **Character-specific hub pages, not a one-size-fits-all character detail view.**
  `app/[locale]/(app)/characters/[character]/page.tsx` now special-cases `khota` to render
  `features/characters/KhotaHub.tsx` (a real dashboard: today/week summaries, active-plan
  list) instead of the generic `CharacterDetailView` every other character still gets.
  Extend this same special-casing per character as Fahes/Rasheed/Kholasa/Sada get their
  own hubs — don't build a second generic-view fork.
- **Khota's Today/Week routes live under the character namespace**
  (`/[locale]/characters/khota/{today,week}`), not under `/study-plans/{today,week}` —
  a deliberate Phase 2 choice (see `FEATURE_PARITY_MATRIX.md`'s Khota section) so the
  character page can be a real workflow hub without restructuring the already-working,
  already-linked-to `/study-plans` list/detail routes.
- **`useSyncExternalStore` is the required pattern for any browser-API read in a render
  body** (`navigator.onLine`, `matchMedia`, zustand-persist hydration status) — three
  separate components got this wrong before Phase 2's live-backend testing surfaced the
  resulting hydration mismatches (see `AUTH_SECURITY.md` §9). A `useEffect` + `setState`
  "mounted flag" is *not* the fix here (and is now flagged by
  `react-hooks/set-state-in-effect` besides) — use the external-store pattern from the
  start for anything reading `window`/`navigator`/a persisted client store during render.

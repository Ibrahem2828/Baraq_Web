# Baraq Web

The production web application for Baraq — the student-facing companion app, rebuilt for
desktop/laptop/tablet/mobile browsers with functional parity to the React Native mobile
app (`../Baraq-App`). Arabic-first (RTL default), English available (LTR), themeable
(light/dark/fire), talking to the same Django backend the mobile app uses.

This is a **Phase 1** deliverable: architecture, design system, i18n, auth, API layer, core
UI components, and the full route skeleton with working feature UIs wired to the real API
contract. See [`docs/PHASE_1_REPORT.md`](./docs/PHASE_1_REPORT.md) for exactly what's done,
what's blocked on the backend, and what Phase 2 picks up.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
TanStack Query · Zustand (theme preference only) · React Hook Form + Zod · next-intl ·
Motion for React · Radix UI primitives · Vitest + Testing Library · Playwright.

Every dependency choice is explained in [`docs/WEB_ARCHITECTURE.md`](./docs/WEB_ARCHITECTURE.md).

## Getting started

```bash
cp .env.example .env.local   # then point BACKEND_API_URL at a running Django backend
npm install
npm run dev
```

Open <http://localhost:3000> (redirects to `/ar`). The backend at `BACKEND_API_URL` must
already be running and have this app's origin added to `CORS_ALLOWED_ORIGINS` /
`CSRF_TRUSTED_ORIGINS` for the BFF proxy to reach it — see
[`docs/AUTH_SECURITY.md`](./docs/AUTH_SECURITY.md).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Serve the production build (copies `public`/`.next/static` into `.next/standalone` first, then runs it — `next start` does not work with standalone output) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript`) |
| `npm run test` / `test:watch` / `test:coverage` | Vitest unit tests |
| `npm run test:e2e` | Playwright (builds + starts the app itself) |
| `npm run format` / `format:check` | Prettier (`prettier-plugin-tailwindcss`) |
| `npm run validate:env` | Fast, dependency-free env sanity gate for CI |
| `npm run audit` | `npm audit --omit=dev` |
| `npm run check` | typecheck + lint + test, the local pre-push gate |

## Project layout

```
src/app/[locale]/(auth)/...     public routes: login, register, forgot/reset password
src/app/[locale]/(app)/...      protected routes: dashboard, characters, library, study
                                plans, quizzes, projects, recommendations, summaries,
                                transcriptions, notifications, subscription, support, settings
src/app/api/{auth,bff}/...      Route Handlers — the only code that ever calls the backend
src/proxy.ts                    locale routing + optimistic auth-redirect (Next 16's
                                middleware.ts rename)
src/config/                     characters, feature flags, env validation, constants
src/design-system/              CSS custom-property tokens, fonts, no-flash theme script
src/components/{ui,layout,      Button/Input/Modal/... primitives, app shell, motion
  feedback,motion,brand}/       helpers, brand components (Logo, CharacterAvatar/Card)
src/features/<domain>/          per-feature api client + React Query hooks
src/lib/{api,auth,query,        BFF client wrapper, envelope/error normalization, cookie
  utils,validation}/            helpers, query client + key registry, shared zod schemas
src/i18n/, src/messages/        next-intl routing + ar/en message catalogs
src/types/domain.ts             shared domain types mirrored from the backend contract
tests/{unit,e2e}/               Vitest + Testing Library, Playwright smoke tests
docs/                           architecture, parity matrix, API contract, design system,
                                auth/security, Phase 1 report
```

## Documentation

- [`docs/WEB_ARCHITECTURE.md`](./docs/WEB_ARCHITECTURE.md) — folder structure, stack rationale, rendering strategy
- [`docs/FEATURE_PARITY_MATRIX.md`](./docs/FEATURE_PARITY_MATRIX.md) — every mobile feature, mapped to its web status
- [`docs/API_CONTRACT_MAP.md`](./docs/API_CONTRACT_MAP.md) — the Django backend contract this app targets
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — tokens, themes, typography, motion
- [`docs/AUTH_SECURITY.md`](./docs/AUTH_SECURITY.md) — the BFF/cookie/CSRF architecture and why
- [`docs/PHASE_1_REPORT.md`](./docs/PHASE_1_REPORT.md) — what shipped, verification results, blockers, Phase 2 entry point

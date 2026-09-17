# Environments

## Overview

Three environments, strictly separated by `APP_ENV` and never silently interchangeable:

| Environment | `APP_ENV` | `BACKEND_API_URL` | Purpose |
|---|---|---|---|
| Development | `development` | `http://localhost:8000` (or a shared dev backend) | Local work against a disposable/local Django instance |
| Staging | `staging` | a real, separate staging backend origin | Pre-production verification against real infrastructure, disposable data |
| Production | `production` | `https://api.baraqapp.com` | Real users, real data |

Staging must never silently use the production API or database, and vice versa —
`scripts/validate-env.mjs` enforces this mechanically (see below), it isn't just a
convention documented here and hoped for.

## How env files are loaded

This is standard Next.js behavior, not a custom mechanism:

1. `.env.$(NODE_ENV).local` (highest priority; gitignored)
2. `.env.local` (gitignored — **not** loaded when `NODE_ENV=test`)
3. `.env.$(NODE_ENV)` — `.env.development`, `.env.production`, or `.env.staging`
4. `.env` (lowest priority)

`.env.local` wins over `.env.production` in every case except `NODE_ENV=test`. This is why
this repository can safely commit a real, filled-in `.env.production` (see below) without
any risk of a local `npm run dev`/`npm run build` on a developer's machine suddenly talking
to the real backend: as long as that developer has a `.env.local` (which every contributor
does, copied from `.env.example`), it wins.

## What's committed vs. what isn't

| File | Tracked in git? | Contains |
|---|---|---|
| `.env.example` | Yes | Placeholder-only template — copy to `.env.local` for local dev |
| `.env.production` | Yes | Real, non-secret production defaults (`BACKEND_API_URL=https://api.baraqapp.com`, `NEXT_PUBLIC_SITE_URL=https://web.baraqapp.com`, etc.) — safe to commit because every value in it is a public-facing hostname or a non-secret feature flag |
| `.env.staging` | Yes, if/when created | Same idea, scoped to staging — not created yet; no staging backend origin has been provided to this project yet |
| `.env.local` | **No** (gitignored) | Real per-developer local overrides |
| `.env.production.local` / `.env.staging.local` | **No** (gitignored) | Where a real secret (an API key, a signing secret) would go **if** one is ever needed for a specific environment — this project currently has none; every value the app needs is either non-secret or lives entirely server-side inside the Django backend, never inside this Next.js app |

This project has no secrets to manage in its own env files today — the BFF pattern
(`src/app/api/bff/[...path]/route.ts`) means the browser never holds an API key or backend
credential; the only sensitive material is the HttpOnly access/refresh cookies, which are
opaque values issued by the backend at login, not configuration.

## Setting up each environment

**Development**: `cp .env.example .env.local`, then edit `BACKEND_API_URL` to point at
whichever Django instance you're running against (a local `runserver`, or a shared dev
instance). `AUTH_COOKIE_SECURE=false` is expected here (no HTTPS locally).

**Staging**: create `.env.staging` (tracked) once a real staging backend origin exists,
following the same shape as `.env.production` below but with the staging host. Do not point
it at `api.baraqapp.com` — `validate-env.mjs` explicitly rejects a preview/staging deploy
(`VERCEL_ENV=preview`) whose `BACKEND_API_URL` matches the production API host, specifically
to prevent this exact mistake.

**Production**: `.env.production` already exists and is correctly filled in — no action
needed to "set up" it beyond what's already committed. If the hosting platform's own env var
mechanism is used instead of (or in addition to) this file, ensure it sets the same values;
platform env vars take precedence over any `.env*` file Next.js would otherwise read.

## Validation

`node scripts/validate-env.mjs` (dependency-free, safe to run as an early CI step before
install/build) checks:

- All required server and public vars are present
- `APP_ENV` is one of `development`/`staging`/`production`
- `BACKEND_API_URL` has no trailing slash
- In production: `BACKEND_API_URL` must be HTTPS, and must not point at `localhost`,
  `127.0.0.1`, or a `.sslip.io` host
- A preview/staging deploy (`VERCEL_ENV=preview`) must not point at the production API host
- No `NEXT_PUBLIC_`-prefixed variable name looks like it's meant to hold a secret
  (`SECRET`/`PASSWORD`/`PRIVATE_KEY`/`TOKEN`)

The same rules are also enforced at runtime by `src/config/env.ts` (Zod schema, server-only)
and `src/config/env.public.ts` (Zod schema, client-safe) — a misconfigured deployment fails
loudly at boot rather than silently serving from the wrong backend.

## Verified in Phase 3

`.env.production` was added and verified in Phase 3 to have **zero effect on local
development**: with `.env.local` still present (pointing at `http://localhost:8000`), the
BFF proxy (`/api/bff/*`) was confirmed live to still reach the local Django instance
(`401` from an unauthenticated request, not a connection failure to `api.baraqapp.com`), and
`npm run typecheck`/`lint`/`build` all remained clean. `api.baraqapp.com` was confirmed to
resolve in DNS (a real, live production host) — no request was made to it, per this phase's
explicit scope (prepare production configuration only, do not connect to it).

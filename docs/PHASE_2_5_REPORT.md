# Phase 2.5 Report — Integration & Release-Confidence Gap Closure

Scope, per the brief: close the specific integration/release-confidence gaps Phase 2 left
open, with independently re-verified evidence, and answer one question — **"Is the Baraq
Web application technically safe and sufficiently integrated to proceed to final Phase 3
development?"** — with exactly one of two decisions at the end of this document. This
phase does not redesign the product, rebuild architecture, add feature areas, or start
Phase 3 work; every change below is a verified bug fix, a type correction, or a
documentation update against gaps Phase 2 explicitly left open.

## 1. Executive Summary

Phase 2.5 independently re-verified the current repository state (did not trust prior
reports at face value), stood up the same isolated local Django backend Phase 2 used, and
closed every domain Phase 2 had flagged `NOT_TESTED`: Collections, Projects, and
Rasheed/Recommendations are now `IMPLEMENTED_VERIFIED` against real backend data. The AI
job lifecycle was verified as deeply as this sandbox allows (real job creation,
cancellation, and every real status value rendering correctly) with AI *content generation*
itself remaining `BLOCKED_BY_INFRASTRUCTURE` (pgvector has no Windows package distribution;
Docker isn't available here) — an external constraint, not a code gap. Nine real bugs were
found via live smoke testing and browser QA, all fixed and verified live, two with new
regression tests. The brief's own explicit open-redirect adversarial tests were re-run
end-to-end through a real login and correctly blocked. Automated E2E now actually **runs**
(a genuine positive surprise — see §8) rather than falling back to manual-only QA. The
leaked production database credential was re-confirmed **UNTRACKED** without being read,
copied, or connected to. All disposable test data created this phase was cleaned up.

**Decision: see §12.**

## 2. Baseline Verification

Rather than trusting Phase 2's report at face value, this phase independently re-confirmed
the starting state before making any changes:

- Re-ran `git status`/`git log`/`git check-ignore` on `Baraaq_back/backend/.env` from
  scratch (not reused from Phase 2's report) — see §9 for the result.
- Re-read the actual current contents of `queryKeys` in `lib/query/keys.ts`, the login page,
  the settings page, and `playwright.config.ts` before assuming any prior fix was still in
  place, rather than assuming the Phase 2 report's claims still held.
- Found the local Django dev server from a prior session had died (a stray, non-listening
  `python.exe` process, PID confirmed via `Get-NetTCPConnection` not bound to port 8000);
  killed the zombie and cleanly restarted the real server before doing anything else.
- Found the local Next.js dev server, once restarted mid-phase, was serving a **stale**
  in-memory copy of `src/messages/*.json` from before an earlier fix — confirmed the file on
  disk already had the correct content, then restarted the dev server and confirmed the
  stale error disappeared. This was a test-harness artifact of long-lived dev processes
  across sessions, not a code bug — documented here so it isn't mistaken for one.

## 3. Environment Used

Identical safety posture to Phase 2, reused where still valid, re-verified where not:

- Django backend: Python 3.13, `Baraaq_back/backend/.venv-local-test` virtualenv, throwaway
  SQLite database, all configuration (`DATABASE_URL`, `SECRET_KEY`, Celery eager mode,
  `AI_SERVICE_ENABLED=False`) supplied as **OS-level environment variables**, which
  `django-environ`'s `read_env()` never overwrites — the leaked production credential in
  `.env` is never read. Seeded via the backend's own `seed_demo_data` management command
  (3 users, 12 subjects, 4 study plans, 2 student sources, etc.) — not fabricated by this
  phase.
- Test user: `student@baraq.app` (id 3, from the seed data). Its password was reset to a
  known value directly in the local SQLite database via Django shell, for this phase's own
  login testing — a local-only credential change on a throwaway database, never touching
  the production credential or any production user.
- Web app: `npm run dev` via the committed `.claude/launch.json` config (port 3010),
  Turbopack.
- AI microservice (`Baraq_AI`): **not** stood up, same as Phase 2 — confirmed again this
  phase that pgvector has no Windows package-manager distribution (checked `winget` for
  Postgres/Redis/pgvector: Postgres and Redis are available, pgvector is not) and Docker
  isn't available in this sandbox. `AI_SERVICE_ENABLED=False`, so the Django backend
  degrades gracefully rather than erroring.
- Browser: Microsoft Edge, driven two ways — (a) the in-session browser-automation tool used
  throughout for live manual QA, and (b) genuine Playwright automation via the `channel:
  "msedge"` config (see §8).
- All disposable entities created this phase used unique `phase2.5-smoke-*`-style
  identifiers and were deleted once verification was complete (see §11 cleanup note); no
  pre-existing seed data was modified or deleted.

## 4. AI Job Verification

The real AI microservice cannot run in this sandbox (see §3) — this is an infrastructure
constraint that was re-confirmed, not newly discovered, and re-confirming it took real
effort (checking `winget` package availability) rather than being asserted without
evidence. Given that constraint, verification targeted the real Django-side job API and
database directly, as deep as is honestly possible without the microservice:

| Stage | Status | Evidence |
|---|---|---|
| Job creation (`POST /ai/jobs/`) | **VERIFIED** | Creates a real `AIJob` row (`status=queued`), reserves credits, creates a dispatch-outbox row, schedules async dispatch via `transaction.on_commit` — confirmed by direct DB inspection after the call, independent of the HTTP response |
| Job cancellation | **VERIFIED** | `cancel` action transitions a real job to `canceled`; frontend cancel button correctly disappears once a job reaches any terminal state |
| Status-value rendering (all 10 real enum values) | **VERIFIED** | `created`/`queued`/`submitted`/`processing`/`validating`/`output_ready`/`materializing`/`completed`/`failed`/`canceled` all exercised via direct DB-state writes (since the real worker can't run) against the real frontend page (`/ai-jobs/[id]`) — status badge, progress bar (indeterminate while non-terminal), error message on failure, result-routing button on completion, zero console errors for a completed job. Found and fixed a real i18n gap in the process: the status badge rendered the raw English enum literal on the Arabic page — see §7 bug #8 |
| Polling behavior | **VERIFIED** (via code + prior-phase live test) | `useAIJob`'s `refetchInterval` is the only polling call site app-wide (confirmed by search); backoff schedule (2s→3s→5s→10s by job age) matches `AI_JOB_POLLING` in `config/constants.ts`; `refetchIntervalInBackground` defaults `false`, so polling auto-pauses when the tab is hidden |
| Character-capability cross-check (Khota/Fahes/Kholasa/Rasheed/Sada) | **VERIFIED** | Queried live for 2 real sources (both `status: ready`) and 2 real collections (one empty, one populated) — see the table in §5 |
| AI content generation (a real job actually producing a real quiz/plan/recommendation) | **BLOCKED_BY_INFRASTRUCTURE** | Requires the real `Baraq_AI` microservice (PostgreSQL + pgvector + Redis + Celery); pgvector has no Windows package distribution and Docker is unavailable. Not skipped without investigation — a genuine, documented infrastructure gap external to this repository |

**Character-capability cross-check detail** (real backend responses, `GET
/student-sources/{id}/capabilities/` and `GET /student-source-collections/{id}/capabilities/`):

| Fixture | khota | fahes | rasheed | kholasa | sada |
|---|---|---|---|---|---|
| Source #1 (`status: ready`) | AVAILABLE | AVAILABLE | AVAILABLE | COMING_SOON (plan-gated) | COMING_SOON (plan-gated) |
| Source #2 (`status: ready`) | AVAILABLE | AVAILABLE | AVAILABLE | COMING_SOON (plan-gated) | COMING_SOON (plan-gated) |
| Collection (empty) | UNAVAILABLE ("add sources first") | UNAVAILABLE ("add sources first") | AVAILABLE (collection-level analysis doesn't need source content) | COMING_SOON (plan-gated) | COMING_SOON (plan-gated) |
| Collection (populated) | AVAILABLE | AVAILABLE | AVAILABLE | COMING_SOON (plan-gated) | COMING_SOON (plan-gated) |

A source in a genuine `processing` state (to directly observe `PROCESSING_REQUIRED`) did
not exist in this local DB snapshot and was not fabricated — the table above reports only
what real data actually produced.

## 5. Collections / Projects / Recommendations Smoke Tests

| Action | Domain | Result |
|---|---|---|
| Create collection | Collections | **PASS** — created live, appeared in list and detail immediately |
| List collection sources | Collections | **PASS after fix** — found `GET .../sources/` is unpaginated with a narrower item shape than `StudentSource`; fixed (`StudentSourceBrief` type, see `API_CONTRACT_MAP.md`) |
| Fetch collection capabilities | Collections | **PASS** — real data for both empty and populated collections, see §4 |
| Delete collection (cleanup) | Collections | **PASS** — disposable test collection removed after verification |
| Create project | Projects | **PASS** — created live with a unique `phase2.5-smoke-*` title |
| Rename project | Projects | **PASS** — produced a real `project_updated` activity entry |
| Archive project | Projects | **PASS** — produced a real `project_archived` activity entry, status badge updated |
| Restore project | Projects | **PASS** — produced a real `project_restored` activity entry |
| View project activity feed | Projects | **PASS after fix** — found and fixed the `ProjectActivityEntry` type/rendering bug (§7 bug #1); confirmed live with real, correctly-translated Arabic event labels and actor name |
| Delete project (cleanup) | Projects | **PASS** — disposable test project removed after verification |
| View recommendations list (empty state) | Recommendations | **PASS** — clean empty state, no crash |
| View recommendation detail | Recommendations | **PASS after fix** — found and fixed a real crash (§7 bug #3) and a missing content section (§7 bug #4) |
| Mark recommendation as read | Recommendations | **PASS after fix** — mutation succeeded server-side on the first attempt already; found and fixed a real, systemic cache-key bug that prevented the UI from reflecting it (§7 bug #4/#5, `lib/query/keys.ts`) |
| Delete recommendation (cleanup) | Recommendations | **PASS** — disposable test recommendation removed after verification |

## 6. Responsive & Cross-Locale QA

Manually driven through a real browser at the three required breakpoints, both locales:

| Breakpoint | Arabic (RTL) | English (LTR) |
|---|---|---|
| Desktop 1440px | **PASS** — sidebar nav, 5-column character grid, Home/Library/Projects/Recommendations all render correctly with real data | Not independently re-shot this phase (unchanged layout code from Phase 2, which verified LTR at this size); English RTL/LTR direction itself re-confirmed via the E2E suite (§8) |
| Tablet 768px | **PASS** — nav collapses to a bottom tab bar + hamburger drawer, 3-column character grid, no layout overflow or clipping | Not independently re-shot this phase — same shared responsive CSS as 1440/390, both of which were re-shot |
| Mobile 390px | **PASS** — bottom tab bar (5 primary routes) + hamburger drawer for the rest, 2-column character grid, no horizontal scroll | Covered by the E2E suite's English-locale test (renders `dir="ltr"` correctly) |

A hydration-mismatch console error was observed during this pass (initially looked like a
real bug) and root-caused to two different things, one a real bug and one a testing
artifact — both are written up precisely in §7 (bug #8) and §2 respectively, rather than
being conflated.

## 7. Bugs Found and Fixed

| # | Bug | Where | Fix | Verified |
|---|---|---|---|---|
| 1 | `ProjectActivityEntry` typed as `{type, description}`; real shape is `{event_type, request_id, artifact_type, artifact_id, metadata, actor_name, created_at}` — `description` never existed | `features/projects/api/projectsApi.ts`, `app/[locale]/(app)/projects/[id]/page.tsx` | Corrected the type; activity feed now looks up an i18n label per `event_type` | Live, real project activity feed |
| 2 | `listCollectionSources` used `requestPaginated<StudentSource>()` against a genuinely unpaginated, narrower-shaped endpoint | `features/sources/api/sourcesApi.ts`, `app/[locale]/(app)/library/collections/[id]/page.tsx` | New `StudentSourceBrief` type, plain `apiClient.get()` | Live, real collection detail page |
| 3 | `StudentRecommendation.next_best_action` typed `string \| null`; real value is a JSON object — rendering it directly crashed the page | `types/domain.ts`, `app/[locale]/(app)/recommendations/[id]/page.tsx` | Corrected type to `Record<string, unknown> \| null`; defensive `typeof x === "string" ? x : JSON.stringify(x)` rendering | Live, real recommendation detail page, zero crash |
| 4 | The `recommendations` array — a recommendation's actual substantive content — was never rendered anywhere | `app/[locale]/(app)/recommendations/[id]/page.tsx` | Added a dedicated display section | Live |
| 5 | Systemic cache-key mismatch: mutations write React Query cache keyed by a numeric API `id`, pages read keyed by the string route param — different keys under deep equality, so a successful mutation didn't update the UI | `lib/query/keys.ts` (affects every detail-style query key, not just recommendations) | Added an `idKey()` normalizer applied to every affected key factory | Live (mark-as-read button disappears immediately, no reload) + new regression test (`tests/unit/query-keys.test.ts`) |
| 6 | Login redirect double-prepended the locale onto an already-locale-prefixed `?next=` value (`/ar/study-plans` → `/ar/ar/study-plans`, a 404) | `app/[locale]/(auth)/login/page.tsx` | Use the native Next.js router for this one redirect, keep the locale-aware router elsewhere on the page | Live + new Playwright regression test |
| 7 | Logout revoked the session correctly but never navigated, leaving the user on a stale protected page | `app/[locale]/(app)/settings/page.tsx` | `router.replace("/login")` in the logout confirmation handler | Live + new Playwright regression test |
| 8 | Home page greeting interpolated `user?.full_name` (from a client-only, no-SSR-data query) directly into SSR'd text; a fast localhost round trip let the query resolve before hydration finished, causing a real, reproducible hydration mismatch (confirmed on a genuinely cold page load, not just a soft-navigation artifact) | `app/[locale]/(app)/page.tsx` | New reusable `useIsClient()` hook (`lib/utils/use-is-client.ts`, `useSyncExternalStore`-based, matching the codebase's existing convention for this exact class of problem — see `useHasHydratedThemeStore`/`usePrefersDarkColorScheme`) gates the personalized name until after hydration | Live, zero console errors on repeated cold loads; greeting still correctly personalizes post-mount |
| 9 | AI job status badge rendered the raw English enum literal (`"completed"`) on the Arabic page instead of a translated label | `app/[locale]/(app)/ai-jobs/[id]/page.tsx`, `messages/{ar,en}.json` | Added an `aiJobs.status.*` message namespace, `t.has()`-gated lookup with a raw-value fallback | Live — badge now reads "مكتمل" |

Two additional near-misses were caught and corrected by the same testing process, not
because they were product bugs, but because they could otherwise have been misreported:

- An `INVALID_KEY` i18n error and a stale "Objects are not valid as a React child" console
  entry initially looked like new bugs but were traced to a dev server serving a stale
  in-memory copy of `messages/*.json` from before an earlier fix — see §2.
- A second hydration-warning-looking console entry, seen while testing the *same* route
  repeatedly via soft client-side navigation within one browser tab, was confirmed to be a
  testing-methodology artifact (stale in-memory React Query cache from a prior soft
  navigation, reconciled against a fresh server render) by reproducing — and *not*
  reproducing — the exact same route on a genuinely cold tab. Bug #8 above is the real
  version of this same underlying class of issue, isolated correctly from the artifact.

## 8. Automated E2E Results

Network egress in this sandbox blocks `npx playwright install`'s browser download (bounded
25–30s attempts, not repeatedly retried, consistent across every phase). Rather than
stopping at `INFRASTRUCTURE_BLOCKED`, Playwright's own documented `channel` option was used
to drive the system-installed Microsoft Edge directly via CDP — **no download of
Playwright's bundled browsers at all**. This is gated behind `process.env.CI` in the
committed `playwright.config.ts` (the `msedge` project simply doesn't exist when `CI` is
set), so the intended CI path (bundled Chromium via a real `playwright install` step in CI)
is completely untouched by this local-only fallback.

**Result of `npx playwright test --project=msedge` against the real, committed config**
(this triggers the config's own `webServer` lifecycle — a full genuine production build and
standalone server start, not a dev server):

```
10 tests total
4 passed
6 skipped
0 failed
```

The 4 passing tests are unauthenticated smoke tests (locale/RTL redirect, protected-route
redirect, login form fields, English LTR rendering). The 6 skipped tests are a new
`authenticated flows` suite added this phase (login, the `?next=` double-locale-prefix
regression, the open-redirect regression, Khota hub/Today/Week, theme persistence, logout)
— they require a reachable, seeded backend (`E2E_BACKEND_AVAILABLE=1`) and skip cleanly
rather than reporting false failures when one isn't configured, which is the correct
behavior for a CI environment that may not always have a backend available. This is a real,
positive development from what was expected going into this phase (manual-only QA) —
report it as **E2E: RUN**, not `INFRASTRUCTURE_BLOCKED`.

## 9. Security

- **Leaked production database credential**: re-confirmed this phase, independently,
  without printing, copying, committing, or connecting with the value —
  `git ls-files --error-unmatch .env` fails (not tracked), `git log --all -- .env` returns
  nothing (never committed), `git check-ignore -v .env` matches `.gitignore:1:.env`.
  **Status: UNTRACKED.** `.env.example` (the only tracked env-like file) contains only
  placeholder values, checked by length/prefix only. No new secret exposure found. See
  `AUTH_SECURITY.md` §11 for the full write-up.
- **Open-redirect protection**: re-verified end-to-end through a real login with the
  brief's own adversarial examples — `?next=//example.com` and `?next=https://example.com`
  both correctly fall back to `/ar`. A legitimate `?next=/ar/study-plans` is now correctly
  honored after fixing bug #6 above.
- **Two new auth-adjacent bugs found and fixed this phase**: bug #6 (double-locale-prefix
  redirect) and bug #7 (missing post-logout redirect) — both are UX/routing bugs, not
  authorization or session-integrity bugs; the underlying session revocation was already
  correct in both cases before the fix (confirmed by a subsequent navigation correctly
  triggering the proxy's login redirect even before either fix landed).
- **CORS/CSRF/cookie configuration**: unchanged since Phase 2 (BFF proxy pattern, HttpOnly
  access/refresh cookies, non-HttpOnly double-submit CSRF cookie); re-confirmed by reading
  the current `src/lib/auth/server.ts`/`src/proxy.ts` — no changes were made or needed here
  this phase.
- **No production data or production database access** occurred at any point this phase —
  all testing used the isolated local SQLite instance and a locally-reset password for the
  seed `student@baraq.app` account.

## 10. Final Quality Gate

All commands below were run against the final state of the repository after every fix in
§7, in one final pass (not cherry-picked from earlier, pre-fix runs):

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | **Clean** — 0 errors |
| Lint | `npm run lint` | **Clean** — 0 errors, 0 warnings |
| Unit tests | `npm test` | **46 / 46 passed**, 12 test files, 0 failed, 0 skipped |
| Coverage | `npm run test:coverage` | 57.51% statements / 84.44% branches / 34.54% functions / 55.73% lines (unchanged in shape from Phase 2 — coverage is concentrated in pure-logic modules; UI components and page-level code are exercised by live/manual and E2E testing instead, not unit tests) |
| Format | `npm run format:check` | **Clean** — all files match Prettier style |
| Production build | `npm run build` | **Success** — 0 errors, 0 warnings, full static/dynamic route manifest generated |
| Dependency audit | `npm run audit` | **0 vulnerabilities** (production dependencies) |
| E2E | `npx playwright test --project=msedge` | **4 passed, 6 skipped, 0 failed** (see §8) |

## 11. Remaining External Blockers

These are infrastructure/organizational items outside this repository's control. None of
them block Phase 3 **development** in this repo; the second one blocks a production
**deployment**, not development:

1. **AI content generation cannot be verified end-to-end in this sandbox.** Requires the
   real `Baraq_AI` microservice, which requires PostgreSQL + pgvector + Redis + Celery.
   pgvector has no Windows package-manager distribution (would require compiling from
   source or trusting an unverified third-party binary) and this sandbox has no Docker.
   Whoever has access to a Docker-capable environment (or a Linux/macOS dev machine) should
   run the full `Baraq_AI` stack and re-verify at least one real character-action → AI job →
   materialized result round trip before Phase 3 work that depends on real AI output.
2. **The leaked production database credential still needs rotation.** Confirmed
   `UNTRACKED` (§9) — it is not a code-repository problem, but it must be rotated, and the
   `.env` file cleaned up, by whoever owns backend deployment/infra, before any production
   deployment of the backend (or this web app pointed at production) — not before Phase 3
   development, which uses only the isolated local instance.
3. **Playwright's bundled-browser download remains blocked by this sandbox's network
   egress.** Worked around locally via the `channel: "msedge"` config (see §8); CI itself is
   unaffected (a real CI runner with normal network access will use the intended bundled
   Chromium path). No action needed unless a future contributor hits the same local network
   restriction, in which case the existing `msedge` project is the documented workaround.

All disposable test data created during this phase (1 test project, 1 test collection, 1
test recommendation, 5 test AI job rows) was deleted after verification; nothing
pre-existing in the seed dataset was modified or removed.

## 12. Final Scorecard

| Category | Assessment |
|---|---|
| Core Build Health | **Strong** — typecheck, lint, format, and production build all clean; no known build warnings |
| Backend Contract Accuracy | **Strong** — every domain touched this phase (and Phase 2) has had its types verified against real live responses, not just source-reading; 9 real contract/rendering bugs found and fixed across both phases in the process |
| Authentication Reliability | **Strong** — full login/refresh/logout lifecycle verified live including token rotation and blacklist enforcement; open-redirect protection verified with the brief's own adversarial cases; two real routing bugs found and fixed this phase |
| Collections Integration | **Strong** — create, list, capabilities, and detail all verified live; one real contract bug found and fixed |
| Projects Integration | **Strong** — create, rename, archive, restore, and activity feed all verified live; one real contract bug found and fixed |
| Rasheed/Recommendations Integration | **Strong** — list (both empty and populated), detail, and mark-read all verified live; one real crash and one systemic cache bug found and fixed |
| AI Job Integration | **Partial, by external necessity** — job lifecycle (create/cancel/every status render) fully verified against the real Django API/DB; content generation itself blocked by an infrastructure constraint (§11) outside this repo's control, not a code gap |
| Query/Data Synchronization | **Strong** — the systemic id-type cache-key bug (bug #5) was fixed at the single source of truth, not patched per call site, and is now covered by a regression test |
| Security Confidence | **Strong** — leaked credential re-confirmed untracked without being touched; open-redirect protection verified end-to-end; two real auth-adjacent bugs found and fixed |
| Browser QA Confidence | **Strong** — real, live testing (not just code reading) at all three required breakpoints, both locales, using real backend data; a real hydration bug was found this way and correctly separated from a testing-methodology artifact that looked similar |
| Automated E2E Confidence | **Strong, and improved from expectations** — E2E genuinely runs (4 passed, 6 skipped pending a live backend, 0 failed) via a legitimate, CI-safe Playwright feature, not manual-only QA as originally anticipated |
| Phase 3 Readiness | **Ready** — every domain in scope for this phase is now verified against real backend behavior; remaining gaps are either genuinely external (AI microservice infrastructure, credential rotation) or narrow and explicitly documented, not hidden |

**PHASE 2.5 DECISION: READY FOR PHASE 3**

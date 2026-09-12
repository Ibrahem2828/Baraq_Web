# Phase 2 Report — Baraq Web

Date: 2026-09-11. Scope: verify Phase 1's claims against a real backend, integrate the real
Baraq assets, complete and verify the core ~50–60% of functionality (auth, profile,
subjects, home, Khota, library/sources, capabilities), eliminate fake/demo behavior,
improve visual fidelity, and leave an honest, measurable handoff for Phase 3.

## 1. Overview — what Phase 2 accomplished

- **Stood up a real, isolated local instance of the actual Django backend** and ran real
  HTTP requests through the web app's own BFF against it — something Phase 1 explicitly
  could not do. This is the single biggest change in verification confidence between the
  two phases. Full setup and safety notes (a leaked production credential was found and
  deliberately never touched) in `BACKEND_INTEGRATION_STATUS.md`.
- **Cross-checked every touched domain type against the real, generated OpenAPI schema**
  (not just Python source), fixing concrete field-level bugs Phase 1 had wrong:
  `grade_level` as a string not a number, `subject` as a nested object not a bare id in
  read responses, a completely wrong `QuizResult`/`QuizAttempt` shape, a wrong
  `SourceCapabilities` shape, and an under-specified `MySubscription.subscription`.
- **Found and fixed a real, live UI bug**: the subscription usage bars indexed two
  differently-keyed objects (`usage` vs `limits`) as if they shared keys — every "used"
  bar silently showed 0% regardless of actual usage.
- **Found and fixed three real React 19 hydration mismatches** (`OfflineBanner`,
  `ThemeToggle`, `Logo`) and the inline theme-boot script that was contributing to them —
  all invisible from source-reading alone, only surfaced by actually logging in and
  browsing the authenticated app in a real browser.
- **Found and fixed a real open-redirect security gap** in the login page's `?next=`
  handling (`startsWith("/")` doesn't reject `//evil.com`).
- **Found and fixed a real RTL rendering bug**: a date range (`"2026-09-07 – 2026-09-13"`)
  rendered reversed inside Arabic (RTL) text due to Unicode bidi reordering of the embedded
  LTR numerals — fixed with directional isolate characters.
- **Integrated the real Baraq character/logo art** (`src/assets/`) — fixed a broken
  `require()`-based asset registry (React Native convention, invalid in this Next.js
  project) into proper ES imports, wired real character illustrations into
  `CharacterAvatar`, a real theme-aware logo into `Logo`, and a verified-good group
  illustration into the auth pages' background. Also **audited and deliberately did not
  wire** a whole category of "empty state" images that turned out to be duplicate/
  mislabeled placeholders — see `ASSET_INVENTORY.md`.
- **Built Khota's real workflow hub** — `/characters/khota` is now a dashboard (today/week
  summaries, real active-plan list) instead of a generic identity page, plus two brand-new
  routes, `/characters/khota/today` and `/characters/khota/week`, resolving Phase 1's
  "Today/Week wired in data but no dedicated routes" gap. All three share query keys with
  Home and the plan-detail page, so a task completion anywhere is reflected everywhere.
- **Updated every required doc** (`FEATURE_PARITY_MATRIX.md`, `API_CONTRACT_MAP.md`,
  `AUTH_SECURITY.md`, `WEB_ARCHITECTURE.md`) with Phase 2 findings, and created the three
  new ones (`ASSET_INVENTORY.md`, `BACKEND_INTEGRATION_STATUS.md`, this file).

## 2. Phase 1 verification — which claims held up

| Phase 1 claim | Verdict |
|---|---|
| "typecheck/lint/test/build all pass" | **Confirmed**, and still pass after every Phase 2 change (re-run repeatedly throughout, not just at the end). |
| "39/39 tests pass, ~66.7% coverage" | **Confirmed** as the Phase 1 baseline. Phase 2 added 5 more (open-redirect coverage), now 44/44. |
| "BFF auth architecture is correct" | **Confirmed and strengthened.** The architecture was sound; Phase 2 live-verified the *actual* rotation/blacklist/revocation behavior it was designed around, and found the redirect-handling bug adjacent to it (not in the BFF itself). |
| "React Query cache keys support cross-screen sync" | **Confirmed by tracing the actual invalidation logic**, not just by architecture inspection — `useCompleteTask`/etc.'s broad `.all` invalidation genuinely does cascade to `.today()`/`.week()`/`.list()`/`.detail()` via React Query's prefix-matching. |
| "Today/Week data-wired but not split into routes" | **Confirmed as accurately described** — and closed this phase. |
| "SourceCapabilities/QuizResult/etc. types match the backend" | **Not confirmed — actively wrong** in several cases (see §API contract corrections below). Phase 1's own docs had correctly flagged some of these as "inferred, verify against the real backend" — Phase 2 did that verification and found the inference was wrong. |
| "No fake/mock data in production paths" | **Confirmed** — the Phase 2 grep sweep for `mock`/`fake`/`demo`/`placeholder`/`hardcoded` found only legitimate matches (HTML `placeholder` attributes, honestly-labeled static About/Privacy/Terms copy awaiting real legal text, code comments). Nothing fabricates a success state. |
| "Account deletion / subscription checkout correctly left unbuilt" | **Confirmed** — re-verified live that `subscription.provider` is `"local"` for every account (no payment integration exists) and that no account-deletion endpoint exists in the real schema either. |
| Character art / logo were "documented placeholders pending Phase 2" | **Confirmed accurately labeled**, and now replaced with real assets — see §3. |

## 3. Assets

- **61 files** integrated from `src/assets/` (copied from the real asset drop at
  `D:\baraaq\image\`), organized by category (logos, app icons, 5×character art,
  backgrounds, onboarding, empty-states, success-states).
- **Integrated and verified good**: all 5 characters' `_full` pose art (correctly
  color-matched to each canonical brand color), 2 logo lockups (theme-aware light/dark),
  1 group hero illustration (used as a subtle auth-page background).
- **Fixed**: the asset registry (`src/assets/assets.ts`) used React Native's `require()`
  convention throughout — invalid in this Next.js/Turbopack project, 49 lint errors.
  Rewritten to ES imports.
- **Unused, and why**: the entire `images/empty/*` folder (7 files) turned out to be the
  identical Sada-purple character image saved under 7 different context-specific
  filenames — confirmed by opening 4 of them side-by-side. Wiring these in would have
  actively misrepresented which character owns which domain. Left unwired; `EmptyState`
  keeps its honest Lucide-icon presentation. `success_subjects_selected.png` is likewise a
  duplicate of the group hero shot, not a distinct illustration. Full detail, including
  what a real Phase 3 content pass should ask for, is in `ASSET_INVENTORY.md`.
- **Optimization**: all wired images go through `next/image` via static ES imports, which
  gives automatic width/height inference, responsive `srcset` generation, and build-time
  optimization — confirmed in the production build output and in DOM inspection (real
  `srcSet`/`sizes` attributes present on rendered `<img>` tags).

## 4. Backend — per-domain status

See `BACKEND_INTEGRATION_STATUS.md` for full detail and evidence. Summary:

| Domain | State | Why |
|---|---|---|
| AUTH | **VERIFIED** | Full lifecycle live-tested: login, refresh+rotation, blacklist-on-reuse, logout+revocation, invalid credentials — both via direct API calls and through the real browser UI. |
| PROFILE | **VERIFIED** | Live read against real seed data; found/fixed a real type bug. |
| SUBJECTS | **VERIFIED** | Live: 3 stages, 12 subjects, 4 user-subjects. |
| HOME | **VERIFIED** | Live in-browser: real user, real tasks, real character hub. |
| PLANS (study plans) | **VERIFIED** | Live: list, today, week (the sparse-days behavior found and handled). |
| TASKS | **VERIFIED** | complete/skip/reopen exercised live; shared query keys confirmed to sync across 5 surfaces. |
| SOURCES | **VERIFIED (read + capabilities)** | Real data, real (corrected) capabilities shape. Upload not live-tested. |
| COLLECTIONS | **NOT_TESTED** | No collection in seed data; code unchanged from Phase 1. |
| AI JOBS | **PARTIAL** | Capabilities endpoint verified graceful-degradation; full job lifecycle needs the AI microservice, out of scope this phase. |
| RASHEED | **NOT_TESTED** | No recommendation in seed data. |
| PROJECTS | **NOT_TESTED** | No project in seed data; code audited, unchanged from Phase 1. |
| NOTIFICATIONS | **VERIFIED (read)** | `unread-count` live-confirmed. |
| SUBSCRIPTIONS | **VERIFIED** | Full real shape confirmed live; real usage-bar bug found and fixed. |

## 5. Testing

Exact results, this session, in order:

```
$ npm run typecheck        → tsc --noEmit                    PASS (0 errors, every run)
$ npm run lint             → eslint .                        PASS (0 errors, every run)
$ npm run test             → vitest run
    Test Files  11 passed (11)
    Tests       44 passed (44)        (was 39 at the start of this phase; +5 new
                                        open-redirect tests)
$ npm run format           → prettier --write .               applied cleanly, no conflicts
$ npm run build            → next build (Turbopack)           PASS, all routes generated
                                                                incl. the 2 new Khota routes
```

**Manual browser QA** (real dev server, real local backend, real login as
`student@baraq.app`):
- Full auth lifecycle end-to-end, including the two hydration bugs and the open-redirect
  bug — all found *because* this was driven through a real browser, not by reading code.
- Arabic RTL confirmed on Home, Khota hub, Today, Week (7-day desktop grid, stacked mobile
  layout at 375px), and the auth pages — including the RTL date-range bug found and fixed.
- Theme system re-verified via the real persistence path (not DOM hacking): light, dark,
  fire all render correctly on the authenticated shell with real character art.
- Responsive spot-check: 375px (mobile — bottom tab bar, stacked week-day cards, no
  horizontal overflow) and desktop (~1440px equivalent — sidebar + topbar, 7-column week
  grid). Full 8-breakpoint matrix from the brief (375/390/430/768/1024/1280/1440/1920) was
  **not** exhaustively run — two representative breakpoints were, given this phase's time
  budget; flagged as a Phase 3 to-do, not silently skipped.

**Playwright**: attempted again this phase (`npx playwright install chromium`, bounded to a
short timeout rather than left to hang) — still blocked by the same network-egress
restriction as Phase 1 (no route to `cdn.playwright.dev`). Not re-attempted repeatedly per
the brief's own instruction not to waste time retrying. The written e2e spec
(`tests/e2e/smoke.spec.ts`) remains unexecuted; every scenario it would cover was instead
exercised manually as described above. **No Playwright scenario is reported as PASS** —
they did not run.

## 6. Security

- **Auth storage**: unchanged from Phase 1 and re-confirmed — access/refresh tokens live
  only in HttpOnly cookies, never reach client JS, never appear in any log statement
  (grepped for `console.log`/`console.error` near token handling — none found touching
  token values).
- **Cookies**: `Secure` (env-gated to match environment), `SameSite=Lax`, correct max-ages
  matching the backend's real token lifetimes (30 min access / 14 days refresh — confirmed
  against the live instance's actual `ACCESS_TOKEN_LIFETIME_MINUTES`/
  `REFRESH_TOKEN_LIFETIME_DAYS`).
- **CSRF**: double-submit cookie pattern unchanged and still correct; not re-tested against
  a live cross-origin request this phase (would need a second origin to test against).
- **CORS**: the live backend's `CORS_ALLOWED_ORIGINS` still doesn't include a web app
  origin — irrelevant to this app's own BFF calls (server-to-server, not subject to browser
  CORS), but still a real infra gap for whoever deploys this, documented previously and
  unchanged.
- **Open redirect**: found and fixed (§1). Covered by a new unit test.
- **Token/secret hygiene**: re-grepped for `mock`/`fake`/`demo`/`hardcoded`/
  `dangerouslySetInnerHTML` across `src/` — clean (see §2 table). `next.config.ts`'s CSP
  now allows `unsafe-eval` in non-production builds only (needed for React's dev-mode
  debugging overlay), confirmed the production branch is untouched.
- **Remaining security blockers, none new this phase**: CSP still uses `'unsafe-inline'`
  for the theme-boot script (documented, low-risk, deferred pending nonce support); no
  distributed lock for the refresh mutex under horizontal scaling (documented, low-risk).
- **Disclosure**: a live production database password was found in
  `Baraaq_back/backend/.env` in plaintext. Not used, connected to, or transmitted by this
  phase's work (a fully isolated local SQLite instance was used instead — see
  `BACKEND_INTEGRATION_STATUS.md`). **This needs rotation by whoever owns backend
  deployment** — it is not something the web app or this phase can remediate.

## 7. Known issues (real, unresolved)

1. AI job full lifecycle (create → poll → complete) genuinely unverified against a live
   backend — needs the AI microservice, which is out of scope for a lightweight local
   integration environment.
2. Collections, Projects, Recommendations: code paths audited and believed correct against
   the documented contract, but **not** live-tested — no seed data existed to exercise them
   and creating fresh ones was outside this phase's time budget.
3. File upload not live-tested with a real file (would need a disposable test asset).
4. Fahes/Rasheed/Kholasa/Sada still use the generic `CharacterDetailView`, not a
   domain-specific hub like Khota's — a real, acknowledged asymmetry, not an oversight.
5. Full 8-breakpoint responsive matrix and a full WCAG 2.2 AA pass were not exhaustively
   run — two representative breakpoints and basic keyboard/landmark checks only.
6. Playwright cannot run in this sandbox (network policy) — written but unexecuted.
7. The empty-state illustration gap (§3) needs a real content decision from the
   brand/design team before Phase 3 can close it.
8. Concurrent-refresh behavior (single-flight mutex) re-read but not re-tested with actual
   parallel requests this phase.
9. `Baraaq_back/backend/.env`'s leaked production credential needs rotation — not fixable
   from this repository.

## 8. Phase 3 scope (concrete, not aspirational)

1. Stand up the AI microservice (or a stub matching its real contract) and verify the full
   AI job lifecycle end-to-end, including adaptive/visibility-aware polling (not built this
   phase — flagged, not fabricated).
2. Build Fahes/Rasheed/Kholasa/Sada hub pages following `KhotaHub`'s pattern; Rasheed's
   recommendations flow specifically, once a live recommendation can be materialized.
3. Live-test Collections, Projects, file upload with disposable test data.
4. Resolve the empty-state asset gap with the brand/design team (either real distinct
   illustrations, or reuse each character's own alternate poses per-context — several
   already exist and are correctly attributed, just not pre-cropped for this purpose).
5. Get a transparent icon-only logo crop from the brand team for compact UI contexts.
6. Run Playwright in an environment with normal network access; expand the e2e suite to
   cover the new Khota routes and the auth bugs found/fixed this phase (regression
   coverage).
7. Full 8-breakpoint responsive QA and a proper WCAG 2.2 AA pass (automated tooling +
   manual keyboard testing) across every core page.
8. Nonce-based CSP to drop the remaining `'unsafe-inline'`.
9. Distributed refresh-mutex lock if/when this app is deployed with more than one instance.
10. Account deletion and subscription checkout, once (and only once) the backend team
    ships real contracts for either.

## 9. Final scorecard

Evidence-based, not inflated — each score reflects what was actually verified this phase,
not the architecture's theoretical ceiling.

| Dimension | Score | Basis |
|---|---|---|
| Architecture Integrity | 90/100 | Phase 1's architecture held up under real backend testing with no structural changes needed — only field-level type fixes and 3 hydration-hygiene fixes, none requiring an architectural rework. |
| Real Asset Integration | 65/100 | Character art and logo genuinely integrated and verified correct; a meaningful chunk of the "empty state" asset set turned out to be unusable placeholders, honestly documented rather than papered over — that gap is real and lowers this score, not a documentation nicety. |
| Visual Fidelity | 70/100 | Real character/logo art now visible throughout; RTL bug found and fixed; one tasteful background integrated. No broad "marketing site → app" visual fidelity pass was done beyond what asset integration itself provided — Fahes/Rasheed/Kholasa/Sada still look generic. |
| Backend Integration | 75/100 | Auth, profile, subjects, home, plans/tasks, sources (read), notifications, subscriptions all genuinely live-verified. AI jobs, collections, projects, recommendations remain unverified against a live instance — a real, sizeable remaining gap, not a rounding error. |
| Authentication Reliability | 90/100 | Full lifecycle live-verified including rotation/blacklist/revocation edge cases and a real security bug fixed. Concurrent-refresh behavior specifically not re-tested this phase. |
| Khota Feature Completion | 85/100 | Hub, Today, Week all live-verified with correct cache sync and a real RTL bug fixed along the way. Editing an AI-generated plan and deeper plan-detail polish remain open. |
| Library/Sources Completion | 70/100 | Read paths and capabilities fully live-verified and a real response-shape bug fixed; upload and collections remain unverified against a live backend. |
| AI Job Reliability | 35/100 | Only capability-reporting graceful-degradation was verified; the actual job lifecycle is untested this phase — this is the single lowest-confidence area in the app today. |
| Responsive Quality | 65/100 | No horizontal overflow or broken layouts found at the breakpoints actually checked (375px, desktop); the full 8-point matrix from the brief wasn't run. |
| Accessibility | 55/100 | Phase 1's baseline (semantic components, focus-visible, Radix-backed keyboard support) unchanged; no dedicated Phase 2 accessibility audit was performed beyond what normal QA surfaced. |
| Automated Testing Confidence | 60/100 | 44/44 unit tests pass and cover real security-relevant logic (including the new open-redirect fix); Playwright remains blocked and unexecuted, which is a genuine gap in end-to-end confidence, not just a missing nice-to-have. |
| Overall Mobile-to-Web Feature Parity | 78/100 | Per `FEATURE_PARITY_MATRIX.md` — the large majority of mobile screens have a working, and now substantially live-verified, web equivalent; the gaps are the same ones mobile itself has (account deletion, payments) plus AI-job-dependent flows this phase couldn't fully exercise. |
| **Phase 2 Completion** | **76/100** | Every explicitly "CRITICAL"/"HIGHEST PRIORITY" item in the brief (Khota Today/Week, real backend connectivity, auth verification, real asset integration, elimination of fake data, honest documentation) was substantively done. What's left is genuinely deferred work (AI jobs, three more character hubs, broader responsive/a11y passes), not undone Phase 2 scope. |

## 10. Phase 2 decision

**NOT READY FOR PHASE 3 — with narrow, specific blockers, not broad ones:**

1. AI job lifecycle must be live-verified (or explicitly re-scoped) before anything
   AI-job-dependent in Phase 3 (Fahes quiz generation UI, Rasheed recommendations, Kholasa/
   Sada launches) can be built on solid ground.
2. The leaked production database credential in `Baraaq_back/backend/.env` should be
   rotated before any shared/staging deployment work begins, independent of this repo.
3. Collections/Projects/Recommendations need at least a smoke-test pass against a live
   backend before being trusted as a foundation for further Phase 3 feature work on top of
   them.

None of these require rearchitecting anything already built. Once the AI microservice is
reachable (even a stub matching its real contract) and the three untested domains get a
live smoke pass, Phase 3 can proceed directly onto the remaining character hubs,
responsive/accessibility hardening, and Playwright regression coverage.

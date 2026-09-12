# Backend Integration Status (Phase 2)

Unlike Phase 1 (source-code audit only, no running backend), Phase 2 stood up a **real,
local instance of the actual Django backend** (`Baraaq_back/backend`) and ran real HTTP
requests through the web app's own BFF against it — login, refresh, logout, subjects,
study plans, quizzes, sources, capabilities, subscriptions, notifications. This document
reports exactly what was and wasn't verified this way, and why.

## How the local backend was set up (and why this is safe)

`Baraaq_back/backend/.env` contains a **live production database password in plaintext**,
with the file's own comment reading "ROTATE THIS: this is a live production password that
was sitting in this file." This was not used, connected to, or transmitted anywhere. A
fully isolated local instance was built instead:

- Python 3.13 + a dedicated virtualenv (`Baraaq_back/backend/.venv-local-test`, gitignored
  by pattern, safe to delete) with `requirements/development.txt` installed, plus
  `whitenoise` (only in `production.txt`, needed at runtime regardless of environment
  since the middleware is unconditional).
- A throwaway SQLite database (`db_phase2_local.sqlite3`), migrated fresh.
- Seeded via the backend's own `python manage.py seed_demo_data` management command — this
  is the backend repo's documented demo dataset (`DEMO_DATA.md`), not fabricated by this
  phase: 3 users (`admin@baraq.app`, `project.admin@baraq.app`, `student@baraq.app`), 3
  education stages, 12 subjects, 4 study plans, 15 tasks, 4 published quizzes, 2 student
  sources, a real subscription record.
- All configuration (database URL, `SECRET_KEY`, cache backend, email backend, Celery
  eager-mode, `AI_SERVICE_ENABLED=False`) passed as **OS environment variables**, which
  `django-environ`'s `read_env()` never overwrites — so the leaked production
  `DATABASE_URL` in `.env` was never read. A small `config/settings_dev_local.py`
  (imports everything from `config/settings.py`, only adds
  `CELERY_TASK_ALWAYS_EAGER = True` so tasks run in-process without a Redis broker) is a
  local-only test harness file, not part of the deployed backend, not referenced by any
  Dockerfile/compose file, safe to delete.
- The AI microservice (`Baraq_AI`) was **not** stood up — `AI_SERVICE_ENABLED=False`. This
  is intentional: it requires Postgres+Redis+pgvector and is out of scope (it's an internal
  service the Django backend calls, never a frontend target — see `API_CONTRACT_MAP.md`).
  Its absence is exactly why the `AI JOBS` row below is `PARTIAL`, not `VERIFIED`.

## Per-domain status

| Domain | Status | Evidence |
|---|---|---|
| **AUTH** | **VERIFIED** | Real HTTP round-trips: login (`200`, correct `{access,refresh,user}` shape) → `users/me` → `refresh` (rotation confirmed: new refresh token differs from old) → reuse of the *old*, now-blacklisted refresh token correctly rejected (`401`) → logout (`204`) → the just-logged-out refresh token correctly rejected (`401`) on a subsequent refresh attempt. Invalid-credentials login correctly returns `401` with a localized Arabic error message matching the documented envelope exactly. All of this was also exercised end-to-end through the actual browser UI (see "Browser verification" below), not just direct API calls. |
| **PROFILE** | **VERIFIED** | `GET /students/profile/` returned the seeded profile; discovered and fixed a real type bug (`grade_level` is a free-text string like "الثالث الثانوي", not a number — Phase 1's type had it wrong). |
| **SUBJECTS** | **VERIFIED** | `education-stages/` (3), `subjects/` (12, paginated), `users/subjects/` (4 attached) all returned real data matching the seed. |
| **HOME** | **VERIFIED** | The actual Home page, loaded in-browser against this backend while authenticated, rendered the real user's name, real today-task list with real completion state, and the real character hub. |
| **PLANS** (study plans) | **VERIFIED** | `study-plans/`, `study-plans/today/`, `study-plans/week/` all returned real data. Found and fixed two real gaps: `week/` was entirely unwired in the frontend (no API function existed), and `week/`'s `days[]` array is **sparse** — it omits any date with zero scheduled tasks rather than returning an empty-tasks entry, which the new Week page now handles correctly by enumerating the full date range and filling gaps. |
| **TASKS** | **VERIFIED** | Task `complete`/`skip`/`reopen` mutations exercised via direct API calls during backend verification; the new `TaskRow` component (shared by Home, Today, and Week) wires all three actions through the same React Query hooks/keys, so a change in one place invalidates and refetches everywhere. |
| **SOURCES** | **VERIFIED (read + capabilities)** | `student-sources/` list returned 2 real seeded sources (`status: ready`). `GET .../capabilities/` returned the real shape — which Phase 1 had guessed wrong (see `API_CONTRACT_MAP.md` for the exact before/after) — now fixed and consumed correctly by the library detail page. Upload was **not** exercised with a real file this phase (would need a disposable test file and is lower-risk than the read paths already covered) — flagged as a remaining gap, not fabricated as done. |
| **COLLECTIONS** | **NOT_TESTED** | No collection existed in the seed data and none was created via live API this phase. The frontend code path (`sourcesApi.ts`) is unchanged from Phase 1 and matches the documented contract; genuinely untested against a live instance. |
| **AI JOBS** | **PARTIAL** | `GET /ai/capabilities/` verified live: correctly returns `{service_enabled: false, characters: [...], task_types: [...], phase_one, phase_two}` — confirming the backend degrades *gracefully* when the AI microservice is disabled, rather than erroring. Attempting `POST /student-sources/{id}/use-with-khota/` correctly returned a `400` validation error (missing `subject`), not a crash — good sign, but no AI job was actually created/polled to completion, since that requires the AI microservice this phase deliberately didn't stand up. The full create→poll→complete lifecycle remains **PARTIAL**, not VERIFIED. |
| **RASHEED** | **NOT_TESTED** | No recommendation existed in the seed data. The `use-with-rasheed` action was not exercised live (it requires a subject, same as Khota's action above, and would need `AI_SERVICE_ENABLED` for a real recommendation to materialize). |
| **PROJECTS** | **NOT_TESTED** | No project existed in the seed data; not exercised live this phase. Code path unchanged from Phase 1. |
| **QUIZZES** | **VERIFIED (read)** | `quizzes/` list and `quizzes/{id}/` detail returned real seeded quiz data (published, 5 questions). The full attempt flow (start→answer→submit→result) was **not** exercised live this phase, but the OpenAPI schema comparison below caught and fixed three real type bugs in that exact flow's types. |
| **NOTIFICATIONS** | **VERIFIED (read)** | `notifications/unread-count/` returned `{count: 0}` correctly against the live instance. |
| **SUBSCRIPTIONS** | **VERIFIED** | `subscriptions/me/` returned the full real shape (`plan`, `subscription`, `usage`, `limits`, `features`, `remaining`) for the seeded free-plan student — and this is how a real, pre-existing UI bug was found: the subscription page indexed `usage` and `limits` by the same key, but they use **entirely different key namespaces** (`usage.khota_requests` vs `limits.max_khota_requests_per_month`), so every "used" progress bar was silently always showing 0. Fixed by deriving `used = limit - remaining` (`limits`/`remaining` do share key names). |

## OpenAPI schema cross-check

`API_DOCS_PUBLIC=true` was set on the local instance specifically to pull the real,
generated OpenAPI schema (`GET /api/schema/?format=json`) and diff it field-by-field
against `src/types/domain.ts`. This is the single highest-value verification step in this
phase — it turned "the contract map says X" into "the actual serializer says X," and found
concrete bugs no amount of source-reading in Phase 1 caught:

- `Subject.grade_level` / `StudentProfile.grade_level`: **string**, not number.
- `StudentSource.subject`, `StudyPlan.subject`, `Quiz.subject`: all nested **objects**
  (`{id, name, education_stage, ...}`) in read responses, not bare numeric ids (only
  create/update *request* bodies use a bare id — a consistent DRF pattern this project's
  types hadn't accounted for).
- `QuizAttempt` was missing `score`/`max_score`/`percentage`/`correct_answers_count`/
  `wrong_answers_count`/`unanswered_count`/`duration_seconds` entirely.
- `submitAttempt()`/`getAttemptResult()` return type was a Phase-1-invented shape
  (`correct_count`, `score`, `total_points`) that doesn't match the real `QuizResult`
  schema at all (`correct_answers_count`, `percentage`, nested `attempt`/`quiz`/`answers`
  objects with a different internal shape again). Fixed with types read directly off the
  schema.
- `MySubscription.subscription` was a 2-field guess; the real `UserSubscription` has 18
  fields (plan details, provider, billing period dates, etc.) — fixed.
- `SourceCharacterResponse`'s generated schema **omits** the `ai_job` field entirely, even
  though it's genuinely present at runtime (confirmed by reading
  `apps/sources/views.py:248-250` and `apps/sources/tests.py`, which assert on it directly)
  — the backend's serializer declares a narrower shape than what the view actually injects
  into the response dict. This is a backend documentation gap, not a frontend bug — the
  existing frontend code that reads `response.ai_job` was already correct; flagging it here
  so it isn't "fixed" incorrectly later by trusting the schema over the tests.

Full before/after detail for every changed type is in the `types/domain.ts` inline comments
and `API_CONTRACT_MAP.md`.

## Browser verification (real login, real session)

Beyond direct API calls, the actual running dev server was driven through a real browser
against this local backend: logged in as `student@baraq.app` (session cookies genuinely
set by the BFF), navigated the authenticated app shell, and confirmed the Home page,
character hub, and the new Khota hub/Today/Week pages all render real backend data
correctly end-to-end — not screenshots of a mocked state.

## Known limitations of this verification

- Single local instance, single test user — no concurrency/load testing.
- AI job lifecycle genuinely unexercised past capability-reporting (see AI JOBS above).
- No destructive operations were run against anything but this throwaway SQLite database
  (never the leaked production credential) — file upload, collection CRUD, and project CRUD
  were not live-tested to avoid scope creep this phase; flagged as `NOT_TESTED` rather than
  assumed working.
- `drf-spectacular`'s generated schema has at least one known gap (`SourceCharacterResponse`
  above) — treat it as strong evidence, not infallible truth, and cross-check against actual
  view/test code when something looks surprising.

## Phase 2.5 update: the domains Phase 2 left NOT_TESTED

Phase 2.5 reused the same isolated local Django instance (same safeguards — OS-level env
vars, throwaway SQLite, leaked `.env` credential never read) and specifically closed the
gaps Phase 2 flagged as `NOT_TESTED`: Collections, Projects, and Rasheed/Recommendations.
Disposable entities were created with unique `phase2.5-smoke-*`-style identifiers, exercised
through the real frontend UI end-to-end (not just direct API calls), and deleted again once
verification was complete — nothing pre-existing was touched or deleted.

| Domain | Phase 2 status | Phase 2.5 status | Evidence |
|---|---|---|---|
| **COLLECTIONS** | NOT_TESTED | **VERIFIED** | Created a collection live through the UI, listed its sources via `GET /student-source-collections/{id}/sources/`, and fetched its capabilities. Found this endpoint is genuinely unpaginated (`{success, message, data:[...]}`, no `meta`) with a narrower item shape than a full `StudentSource` — the frontend used `requestPaginated<StudentSource>()` for it, architecturally wrong even though a graceful fallback in `requestPaginated` kept it from crashing. Fixed with a new `StudentSourceBrief` type and a plain `apiClient.get()` call (`src/features/sources/api/sourcesApi.ts`, `src/app/[locale]/(app)/library/collections/[id]/page.tsx`). |
| **PROJECTS** | NOT_TESTED | **VERIFIED** | Created, renamed, archived, and restored a disposable test project live through the UI; each action correctly produced a new row in `GET /projects/{id}/activity/`. Found `ProjectActivityEntry` was typed as `{type, description}` (a Phase-1 guess) while the real shape is `{event_type, request_id, artifact_type, artifact_id, metadata, actor_name, created_at}` — the frontend rendered `entry.description`, a field that doesn't exist. Fixed the type and the rendering (now looks up an i18n label for `event_type`, falling back to the raw value for any event type not yet translated). |
| **RASHEED / RECOMMENDATIONS** | NOT_TESTED | **VERIFIED (with a real crash found and fixed)** | Fetched a recommendation detail live and hit an actual browser crash: "Objects are not valid as a React child," because `next_best_action` (a Django `JSONField`, genuinely an object like `{action, label}`) was typed as `string \| null` and rendered directly in a `<p>`. Also found the `recommendations` array — the actual substantive content of a recommendation — was never rendered anywhere on the page. Fixed the type (`Record<string, unknown> \| null`, plus the previously-missing `source_metrics`/`updated_at` fields), added a dedicated `recommendations` list section, and added defensive `typeof x === "string" ? x : JSON.stringify(x)` coercion anywhere a freeform JSONField value reaches JSX (the existing strengths/weaknesses rendering had the same latent risk). Separately found and fixed a systemic cache bug: a real, successful "mark as read" mutation (confirmed `200` with `is_read: true`) didn't update the UI, because the mutation wrote the query cache keyed by a numeric `id` while the page read it keyed by the string route param — different keys under React Query's deep-equality check. Fixed once, at the root, in `src/lib/query/keys.ts` (an `idKey()` normalizer applied to every detail-style key factory, not just recommendations), with a new regression test (`tests/unit/query-keys.test.ts`). |
| **AI JOBS** | PARTIAL | **PARTIAL, more evidence** | The real AI microservice (`Baraq_AI`) still cannot run in this sandbox — it requires PostgreSQL + pgvector + Redis + Celery, and pgvector has no Windows package-manager distribution (would need compiling from source or trusting a third-party binary; genuinely infeasible without Docker, which isn't available here either). This is `BLOCKED_BY_INFRASTRUCTURE`, not skipped. What *was* exercised against the real Django-side job API/DB: real job creation (`POST /ai/jobs/` creates a real `AIJob` row, reserves credits, schedules async dispatch via `transaction.on_commit`), real cancellation, and direct DB-state transitions (`queued`→`processing`→`completed`/`failed`/`canceled`) to verify the frontend's `useAIJob` polling hook, status badge, progress bar, cancel button, and result-routing all handle every real status value correctly — confirmed live in-browser, zero console errors, for a `completed` job. Also found and fixed a real i18n gap: the status badge rendered the raw English enum literal (`"completed"`) on the Arabic page instead of a translated label — added an `aiJobs.status.*` message namespace in both locales. AI **content generation** itself remains unverified end-to-end; that requires the real microservice and stays a Phase 3 (or later) infrastructure item, not a code gap in this repo. |
| **Character-capability cross-check** | not attempted | **VERIFIED (real backend data)** | Queried `GET /student-sources/{id}/capabilities/` and `GET /student-source-collections/{id}/capabilities/` live for both of the seed dataset's sources (both `status: ready`) and both existing collections (one empty, one populated). Real, consistent pattern observed: `khota`/`fahes` require actual source content (`"أضف مصادر أولاً"` — "add sources first" — on the empty collection, available everywhere else); `rasheed` is available even on an empty collection (project/collection-level performance analysis doesn't need source content); `kholasa`/`sada` are uniformly `available: false` with `"هذه الشخصية غير متاحة في خطتك الحالية"` ("not available on your current plan") — a subscription-plan gate, not a processing-state gate, confirming these two are COMING_SOON by product design rather than a broken capability check. A source in a genuine `processing` state (to observe `PROCESSING_REQUIRED` directly) did not exist in this local DB snapshot and wasn't fabricated — the two states above are what real data actually produced. |

None of the Phase 2.5 fixes touch architecture, add new feature areas, or introduce new
abstractions — every change is a type correction, a rendering fix for data the backend was
already sending, or a cache-key normalization at the existing single point of truth.

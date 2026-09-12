# Baraq Web — API Contract Map

Verified against `D:\baraaq\Baraaq_back\backend` (Django + DRF), the real public
consumer-facing backend at `api.baraqapp.com`. **`Baraq_AI` (the FastAPI service under
`D:\baraaq\Baraq_AI`) is NOT this backend** — it's an internal AI microservice the Django
backend calls server-to-server over HMAC-signed requests; the web app (like the mobile
app) never talks to it directly. This was a real discrepancy in the initial task framing,
corrected during the Phase 1 audit — see `PHASE_1_REPORT.md` §"Discovered mobile/backend
inconsistencies".

Canonical machine-readable source once available: `GET /api/schema/` (drf-spectacular
OpenAPI 3, admin-only unless the backend sets `API_DOCS_PUBLIC=true`). This document was
the manually-verified equivalent for Phase 1; **Phase 2 actually pulled this schema from a
live local instance** (`API_DOCS_PUBLIC=true` set for that instance only — see
`BACKEND_INTEGRATION_STATUS.md`) and diffed it field-by-field against `src/types/domain.ts`.
That is the authoritative source for exact field types now — see "Phase 2 corrections"
below for what it changed. Get an admin token or a temporarily-flipped `API_DOCS_PUBLIC` on
any future backend instance before hand-maintaining these types further; do not re-guess
field shapes from serializer reading alone when the real schema is one flag away.

## Phase 2 corrections (verified against the live OpenAPI schema + real HTTP responses)

Phase 1's types were **mostly right on route paths and general shape**, but wrong on
several field-level details that only reading the actual generated schema (not just
Python source) would catch:

- **`grade_level` (`Subject`, `StudentProfile`) is a string** (e.g. `"الثالث الثانوي"`),
  not a number. Confirmed both in the schema (`{"type": "string", "maxLength": 50}`) and in
  a real live response.
- **`subject` is a nested object, not a bare id, in every *read* response** —
  `StudentSource.subject`, `StudyPlan.subject` (`StudyPlanList`/`StudyPlanDetail`),
  `Quiz.subject` (`QuizList`/`QuizDetail`). Only *write* request bodies
  (`StudyPlanCreateRequest`, `QuizCreateRequest`, etc.) use a bare numeric id — a
  consistent DRF read/write asymmetry Phase 1 hadn't modeled.
- **`StudentSource`/`StudentSourceCollection`** also carry derived read-only fields Phase 1
  didn't have: `subject_name`, `collection_id`, `collection_name` (source);
  `subject_name`, `source_count`, `total_file_size`, `last_source_at`, `characters_summary`
  (collection).
- **`GET /student-sources/{id}/capabilities/` response shape was wrong.** Phase 1 guessed
  `{characters: {khota: {available, reason}}}`. The real shape (confirmed live) is a **flat**
  map: `{khota: {available, actions: string[], message: string}, fahes: {...}, ...}` — no
  wrapping `characters` key, and the per-character fields are `available`/`actions`/
  `message`, not `available`/`reason`. `message` is always a human-readable Arabic string,
  even when `available: false` (e.g. explaining a plan limit) — the UI now surfaces it
  instead of just hiding the unavailable action.
- **`POST /student-sources/{id}/use-with-character/`'s response includes `ai_job`, but the
  generated OpenAPI schema (`SourceCharacterResponse`) omits it.** Reading
  `apps/sources/views.py:248-250` and `apps/sources/tests.py` (which assert on
  `response.data['ai_job']` directly) confirms it's genuinely present at runtime — the
  view injects it into the response dict outside the serializer's declared fields. This is
  a **backend documentation gap**, not a frontend bug: the existing frontend code that
  reads `response.ai_job` was already correct. Don't "fix" this later by trusting the
  schema over the tests.
- **`QuizAttempt` was missing most of its fields** (`score`, `max_score`, `percentage`,
  `correct_answers_count`, `wrong_answers_count`, `unanswered_count`, `duration_seconds` —
  all present in the real schema, all decimal fields serialized as strings).
- **`submitAttempt()`/`getAttemptResult()`'s return type was invented and wrong.** Both
  `POST /quiz-attempts/{id}/submit/` and `GET /quiz-attempts/{id}/result/` return the same
  `QuizResult` schema: `{attempt, quiz, answers: GradedQuestion[], correct_answers_count,
  wrong_answers_count, unanswered_count, percentage, recommendations}` — not the
  `{correct_count, wrong_count, score, total_points}` shape Phase 1 had made up. Fixed in
  `types/domain.ts` (`QuizResult`, `GradedQuestion`, `GradedChoice`).
- **`GET /subscriptions/me/`'s `subscription` field is a full `UserSubscription` record**
  (18 fields: `id`, `user`, `user_email`, `user_full_name`, `plan`, `plan_name`,
  `plan_code`, `status`, `started_at`, `current_period_start`, `current_period_end`,
  `trial_ends_at`, `canceled_at`, `auto_renew`, `provider`, `provider_subscription_id`,
  `created_at`, `updated_at`) — Phase 1's 2-field guess (`{status, current_period_end}`)
  was far too thin. Confirmed live: `provider` is `"local"` for every account (no real
  payment provider integrated — see "Known backend gaps" below).
- **`usage` and `limits`/`remaining` use unrelated key namespaces**, confirmed live:
  `usage.khota_requests` vs `limits.max_khota_requests_per_month`. A pre-existing frontend
  bug indexed `usage` by the same keys as `limits`, so every subscription usage bar always
  showed 0% used — fixed by deriving `used = limit − remaining` instead (`limits` and
  `remaining` *do* share key names).
- **`GET /study-plans/week/`'s `days[]` array is sparse** — a date with zero scheduled
  tasks is omitted entirely, not returned with `tasks: []`. Confirmed live: a 7-calendar-day
  range (`start_date` to `end_date` inclusive) returned only 5 `days[]` entries. The web
  UI now enumerates the full date range and fills gaps itself rather than assuming
  `days.length` matches the range.
- **`today/` and `week/`'s tasks include a nested `plan: {id, title, status, subject}`**
  (`TodayTask` in the schema) that a plan's own `tasks[]` (plain `StudyTask`) does not —
  the parent is already implicit there. Phase 1 only had the plain `StudyTask` shape and
  had not wired `week/` into the frontend API layer at all (a real gap, not just a type
  issue — fixed this phase, see `FEATURE_PARITY_MATRIX.md`'s Khota section).

## Phase 2.5 corrections (found via live smoke testing of Collections, Projects, Recommendations)

Phase 2 flagged Collections, Projects, and Rasheed/Recommendations as `NOT_TESTED` against
a live backend. Phase 2.5 exercised all three live and found three more real,
field-level contract mismatches — the same class of bug as Phase 2's corrections above,
just in the domains Phase 2 didn't reach yet:

- **`GET /student-source-collections/{id}/sources/` is a plain, unpaginated array**
  (`{success, message, data: [...], request_id}` — no `meta` key at all), and its items are
  a narrower shape than a full `StudentSource`. The frontend used
  `requestPaginated<StudentSource>()` for it — not a crash (a fallback path degrades
  gracefully to `data.length`), but architecturally wrong and typed with fields the real
  response doesn't have. Fixed with a dedicated `StudentSourceBrief` type (`id`, `title`,
  `source_type`, `project`, `subject`, `collection`, `collection_id`, `collection_name`,
  `original_filename`, `file_size`, `extension`, `status`, `created_at`) and a plain
  `apiClient.get<StudentSourceBrief[]>()` call.
- **`GET /projects/{id}/activity/` entries are `{event_type, request_id, artifact_type,
  artifact_id, metadata, actor_name, created_at}`**, not the Phase-1-guessed
  `{type, description, created_at}`. `description` doesn't exist on the real object at all
  — the frontend was rendering a field that was always `undefined`.
- **`StudentRecommendation.next_best_action` is `Record<string, unknown> | null`** (a
  Django `JSONField`, genuinely an object like `{action, label}`), not `string | null` as
  typed. Rendering it directly as `{data.next_best_action}` crashed the page ("Objects are
  not valid as a React child"). Also added the previously-missing `source_metrics` and
  `updated_at` fields, both genuinely present on the real object. Every other freeform
  JSONField-backed value reachable from JSX (recommendation `strengths`/`weaknesses`) now
  gets the same defensive `typeof x === "string" ? x : JSON.stringify(x)` treatment, since
  this is a structural risk anywhere a Django `JSONField` reaches a React text node
  directly, not a one-off.

## Envelope

Every response: `{ success, message, data, meta?, request_id }` (success) or
`{ success: false, message, code, errors, request_id }` (error). Paginated lists put the
array in `data` and `{count, next, previous}` in `meta` — **not** DRF's raw
`{count, next, previous, results}` shape. See `src/lib/api/envelope.ts`.

## Base path & versioning

`/api/v1/...` is canonical. A legacy `/api/...` alias exists but responds with
`Deprecation`/`Sunset`/`Link` headers (`Sunset: 2026-12-31`) — this app only ever uses
`/api/v1/...`, encoded once in `src/lib/api/backend.ts`.

## Auth (`/api/v1/auth/...`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `register/` | Public (throttle 10/hr) | `{email, full_name, phone_number?, password, password_confirm}` → creates `User` + auto `StudentProfile`. No email verification step exists. |
| POST | `login/` | Public (throttle 10/min) | `{email, password}` → `{access, refresh, user}` |
| POST | `refresh/` | Public | `{refresh}` → `{access, refresh}` — rotation + blacklist-after-rotation, must persist the new refresh token every time |
| POST | `verify/` | Public | `{token}` |
| POST | `logout/` | Bearer | `{refresh}` → 204, blacklists it |
| POST | `change-password/` | Bearer | `{current_password, new_password}` |
| POST | `password-reset/` | Public (throttle 5/hr) | `{email}` → generic message always, no enumeration. Backend's `FRONTEND_PASSWORD_RESET_URL` currently defaults to a mobile deep link — the web app needs its own env value (see `.env.example`) so emailed links land on `/[locale]/reset-password` instead. |
| POST | `password-reset/confirm/` | Public | `{uid, token, new_password}` |

Access token lifetime 30 min, refresh 14 days (both env-configurable on the backend, must
match cookie max-ages in `src/lib/auth/cookies.ts`). **No self-service account deletion
endpoint exists anywhere in this API.**

## Users / students / subjects

| Method | Path | Notes |
|---|---|---|
| GET/PATCH | `users/me/` | `{id,email,full_name,phone_number,role,created_at,updated_at}` — email/role read-only |
| POST | `students/setup-profile/` | `{education_stage, grade_level, specialization?, study_goal?, daily_study_hours?}` |
| GET/PATCH | `students/profile/` | |
| GET | `education-stages/` | Public, **unpaginated** |
| GET | `subjects/` | Public, paginated, filters `education_stage,grade_level,is_active` |
| GET/POST | `users/subjects/` | POST `{subject: id}` |
| DELETE | `users/subjects/{id}/` | |

## Projects (`/projects/`, lookup by `public_id` UUID, not int)

CRUD + `POST {id}/archive/`, `POST {id}/restore/`, `GET {id}/activity/` (paginated event
log). `Project.status`: `active|archived`.

## Study plans (`/study-plans/`, `/study-tasks/`)

`POST /study-plans/` is **manual-draft only** — `generation_type=ai` is rejected with a
message pointing at `POST /ai/jobs/` (`task_type=khota_generate_plan`). Also:
`GET today/`, `GET week/?start_date=`, `GET/POST {id}/tasks/`,
`POST /study-tasks/{id}/{complete|skip|reopen}/`. Enums: `status`
(`draft|active|completed|cancelled`), `difficulty_level` (`easy|medium|hard`),
`generation_type` (`manual|ai`), task `status`
(`pending|in_progress|completed|skipped`), `priority` (`low|medium|high`).

## Quizzes (`/quizzes/`, `/quiz-questions/`, `/quiz-attempts/`, `/question-bank/`)

Same manual-vs-AI split as study plans (`task_type=fahes_generate_quiz` for AI
generation). `POST /quizzes/{id}/publish/` required before `POST /quizzes/{id}/start/`
(→ new attempt). Attempt flow: `POST /quiz-attempts/{id}/answer/` →
`POST /quiz-attempts/{id}/submit/` → graded `QuizResultSerializer` (also re-fetchable via
`GET /quiz-attempts/{id}/result/`). In-progress attempts never expose correct answers.
Enums: quiz `status` (`draft|published|archived`), `quiz_type`
(`practice|exam|quick`), question `question_type` (`mcq|true_false|short_answer` —
`short_answer` not yet enabled backend-side), attempt `status`
(`in_progress|submitted|abandoned`).

## Sources & collections (`/student-sources/`, `/student-source-collections/`)

Upload constraints (`apps/sources/validators.py`): extensions
`pdf,txt,jpg,jpeg,png,webp,doc,docx,ppt,pptx,mp3,m4a,wav`; max size env-default 25MB but
**can be lower per subscription plan**; magic-byte signature validation; `.docx`/`.pptx`
get zip-bomb/macro/path-traversal scanning. `status`:
`uploaded → processing → ready|failed` — client polls `GET /student-sources/{id}/`, no
push channel. Character actions: `POST {id}/use-with-character/` (generic, body
`{character, action?}`) or the fixed shortcuts `POST {id}/use-with-{khota|fahes|rasheed|
kholasa|sada}/`. Response shape varies — may include `ai_job`, or a synchronous
`interaction`/`advice` with no job at all. Collections mirror the same shape at
`/student-source-collections/{id}/...`; `capabilities/` on either tells the client which
characters/actions are currently available (subscription-plan gated).

## AI jobs (`/ai/...`) — the async pipeline

No WebSocket/SSE exists — **polling only**. `POST /ai/jobs/` → 202/200 `AIJob`; client
polls `GET /ai/jobs/{public_id}/` (passive) or `POST /ai/jobs/{public_id}/refresh/`
(forces an upstream sync) until `status` is terminal
(`completed|failed|canceled`). Full status enum: `created → queued → submitted →
processing → validating → output_ready → materializing → completed|failed|canceled`.
`src/config/constants.ts`'s `AI_JOB_POLLING` schedule (2s → 3s → 5s → 10s by job age)
mirrors the mobile app's backoff exactly. On completion, `result_type`/`result_id` point
at a materialized domain object — fetch it via the matching read-only endpoint, don't
parse `result_payload` directly:

| `task_type` | character | materializes into | fetch via |
|---|---|---|---|
| `fahes_generate_quiz` | fahes | `Quiz` | `GET /quizzes/{id}/` |
| `khota_generate_plan` | khota | `StudyPlan` | `GET /study-plans/{id}/` |
| `rasheed_recommendations` | rasheed | `StudentRecommendation` | `GET /recommendations/{id}/` |
| `kholasa_generate_summary` | kholasa | `Summary` | `GET /summaries/{id}/` |
| `sada_transcribe_audio` | sada | `Transcription` | `GET /transcriptions/{id}/` |

Legacy task-type aliases (`kholasa_summary`, `sada_transcription`, etc.) are silently
normalized server-side — this app only ever emits the canonical names above.
`POST /ai/jobs/{public_id}/feedback/` only accepted once `status=completed` (409
otherwise). Rate limit: 100/day (`ai_requests` throttle scope), shared with the
per-source character-action endpoints.

## Read-only results (`/recommendations/`, `/summaries/`, `/transcriptions/`)

List/retrieve only — created exclusively as an AI job side effect. `POST
/recommendations/{id}/mark-read/` is the one write action across all three.

## Subscriptions (`/subscriptions/...`)

`GET plans/` (public), `GET me/` (`{plan, subscription, usage, limits, features,
remaining}`). **No checkout/upgrade endpoint exists** — `PAYMENTS_ENABLED` is a flag with
no payment-provider integration behind it anywhere in the codebase. Limit-exceeded errors
surface as 400s with `code` in `{source_limit_reached, collection_limit_reached,
storage_limit_exceeded, file_size_limit_exceeded, character_limit_reached,
character_not_allowed, ai_request_limit_reached}` — `src/lib/api/errors.ts` maps all of
these to a single `SUBSCRIPTION_LIMIT` `ApiError.code` regardless of HTTP status, so the
UI can treat them uniformly as an upsell moment.

## Notifications / Support / Waitlist

Notifications: list/detail/`unread-count/`/`mark-read/`/`mark-all-read/` — read-only
otherwise, server-generated, poll-only (no push). Support tickets: list/create/detail +
`{id}/messages/` (reply) + `{id}/close/` — no PATCH/DELETE. Waitlist (`/waitlist/`) is
public marketing-site-only, not used by this app.

## Cross-cutting

- **Request ID**: send `X-Request-ID` (backend validates `^[A-Za-z0-9._-]{8,128}$`, else
  generates one); always echoed back as both a response header and `request_id` in the
  envelope. `src/lib/utils/request-id.ts` generates `web-<ts>-<rand>` client-side.
- **Pagination**: `?page=&page_size=` (max 100), reflected as `meta.count/next/previous`.
- **Rate limits**: `anon` 60/hr, `user` 2000/day, `register` 10/hr, `login` 10/min,
  `password_reset` 5/hr, `uploads` 30/hr, `ai_requests` 100/day, `waitlist` 5/hr.
- **CORS**: `CORS_ALLOWED_ORIGINS` does not yet include this app's origin — see
  `docs/AUTH_SECURITY.md` §1. This is exactly why the BFF pattern is required, not
  optional, for Phase 1.

## Known backend gaps (flagged to the backend team, not fabricated in the frontend)

1. No self-service account deletion endpoint.
2. No subscription checkout/payment-provider integration.
3. `FRONTEND_PASSWORD_RESET_URL` defaults to a mobile deep link scheme, not a web URL —
   needs an env override (or a second, web-specific setting) once this app is deployed.
4. `frontend_api_contract.json`/`frontend_api_contract_summary.md` in the backend repo
   reference a stale host (`api.barraq.xn--mgbaab0cxheq.tech`) — the actual
   production host per `docker-compose`/`.env` is `api.baraqapp.com`. Trust the
   deployment config over that doc file if they ever disagree again.

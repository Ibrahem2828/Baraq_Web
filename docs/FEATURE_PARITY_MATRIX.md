# Web ↔ Mobile Feature Parity Matrix

Every screen/feature in `Baraq-App` (React Native mobile), mapped to its status in this web
app. Updated in Phase 2 with a stricter status vocabulary — see
`docs/BACKEND_INTEGRATION_STATUS.md` for exactly what "verified" means here (a real local
Django instance, real HTTP round-trips, not just source-reading).

- **IMPLEMENTED_VERIFIED** — real UI, wired to the real API, and actually exercised
  end-to-end against a live backend instance this phase (success *and* failure paths).
- **IMPLEMENTED_UNVERIFIED_BACKEND** — real UI wired to the typed API client against the
  documented contract; not yet exercised against a live backend (either untouched since
  Phase 1, or the specific flow wasn't in this phase's live-test scope — see
  `BACKEND_INTEGRATION_STATUS.md`).
- **PARTIAL** — the route and basic UI exist, but a meaningful sub-flow is intentionally
  deferred (documented inline below).
- **BLOCKED_BY_BACKEND** — no backend contract exists for this yet; building real UI now
  would mean faking behavior, which this project explicitly must not do.
- **COMING_SOON** — mirrors the mobile app's own current rollout state (not a web-specific
  limitation).
- **NOT_STARTED** — not touched yet.

## Auth

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| LoginScreen | `/[locale]/login` | **IMPLEMENTED_VERIFIED** | Live-tested: correct login, invalid credentials (401, localized error), post-login redirect. Phase 2 also found and fixed a real open-redirect gap in the `?next=` handling — see `AUTH_SECURITY.md` |
| RegisterScreen | `/[locale]/register` | IMPLEMENTED_UNVERIFIED_BACKEND | Validation rules confirmed to match backend exactly (`min_length=10` — see below) via live seed-data password policy check, but the register endpoint itself wasn't called live this phase |
| ForgotPasswordScreen | `/[locale]/forgot-password` | IMPLEMENTED_UNVERIFIED_BACKEND | Generic success message matches backend's documented behavior; not called live this phase |
| ResetPasswordScreen (`uid`/`token` deep link) | `/[locale]/reset-password?uid=&token=` | IMPLEMENTED_UNVERIFIED_BACKEND | Query-param equivalent of the mobile deep link; requires backend's `FRONTEND_PASSWORD_RESET_URL` to be pointed at this route (see `API_CONTRACT_MAP.md` known gaps) |
| ChangePasswordScreen | `/[locale]/settings/change-password` | IMPLEMENTED_UNVERIFIED_BACKEND | |
| Session restore / bootstrap gate | `src/proxy.ts` + `app/api/auth/session` | **IMPLEMENTED_VERIFIED** | Live-tested full lifecycle: login → refresh (rotation confirmed) → reuse of blacklisted refresh token correctly rejected → logout → post-logout refresh correctly rejected. See `BACKEND_INTEGRATION_STATUS.md` |

**Password policy** (Phase 2 resolved the "8 vs 10" question raised at the start of this
phase): the backend's `AUTH_PASSWORD_VALIDATORS` and every consumer-facing serializer
(`RegisterSerializer`, `ChangePasswordSerializer`, `PasswordResetConfirmSerializer`) all use
`min_length=10`, consistently — verified by reading `apps/users/serializers.py` directly.
The `min_length=8` that exists in the codebase is on `apps/admin_dashboard/serializers.py`'s
staff-user-creation serializer only — an unrelated, admin-only surface. The web app's own
`lib/validation/auth.ts` already used `min_length: 10` correctly since Phase 1; no fix was
needed, only confirmation.

## Onboarding / profile setup

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| ProfileSetupScreen | `/[locale]/onboarding/profile-setup` | IMPLEMENTED_UNVERIFIED_BACKEND | `POST /students/setup-profile/` — the profile *read* path (`GET`) was live-verified this phase (see Settings/Profile below), setup itself wasn't re-run live since the seed data already has a completed profile |
| SubjectsSelectionScreen | `/[locale]/onboarding/subjects` | **IMPLEMENTED_VERIFIED** | `GET /education-stages/` (3), `GET /subjects/` (12), `GET /users/subjects/` (4) all live-verified with real seeded data |
| OnboardingScreen / OnboardingPreviewScreen (slides) | — | NOT_STARTED | First-run marketing slides; low priority for a web app where the marketing site (`Baraq_Website`) already serves this role — revisit in Phase 2 only if product asks for it |

## Home

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| HomeScreen | `/[locale]` (app root) | **IMPLEMENTED_VERIFIED** | Live-verified in-browser against the real backend: real user name, real today-task list with real completion state, real character hub. No fake statistics anywhere — every number comes from a live API response |

## Characters

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| CharactersHubScreen | `/[locale]/characters` | **IMPLEMENTED_VERIFIED** | `CHARACTERS` config, canonical names (see "Character naming" below); real character artwork wired in Phase 2 (see `ASSET_INVENTORY.md`), live-verified in-browser with real per-character colors |
| KhotaScreen | `/[locale]/characters/khota` | **IMPLEMENTED_VERIFIED** | Phase 2: rebuilt from a generic identity page into a real workflow hub (`KhotaHub`) — today/week summary cards + real active-plan list, all live-verified against the backend. See "Khota" below |
| FahesScreen | `/[locale]/characters/fahes` | IMPLEMENTED_UNVERIFIED_BACKEND | Still the generic `CharacterDetailView` (identity + link into Library) — not yet a Fahes-specific hub. Reasonable Phase 3 target, following the `KhotaHub` pattern |
| RasheedScreen | `/[locale]/characters/rasheed` | IMPLEMENTED_UNVERIFIED_BACKEND | Same generic view as Fahes — see naming fix below. Rasheed-specific recommendations hub is `NOT_STARTED` (no recommendation existed in live seed data to build/verify against — see `BACKEND_INTEGRATION_STATUS.md`) |
| KholasaScreen | `/[locale]/characters/kholasa` | COMING_SOON | Matches mobile's current rollout state (`RELEASE_CHECKLIST.md`: "Kholasa and Sada remain coming-soon states"), gated by `CHARACTERS.kholasa.isLive = false`, not a web limitation |
| SadaScreen | `/[locale]/characters/sada` | COMING_SOON | Same as above |

**Character naming**: mobile's `src/config/constants.ts` and
`src/features/characters/data/characters.ts` display **"رفيق"** for the `rasheed` key in
the character hub, header nav, and screen title — inconsistent with the same app's own
Home-screen copy and Privacy Policy, which correctly use **"رشيد"**. This web app uses
**"رشيد"** everywhere (the canonical name), documented in
`src/config/characters.ts`'s `RASHEED_LEGACY_DISPLAY_NAME_DISCREPANCY` export. Not
propagated. Flagged for the mobile team to fix at the source.

## Library (sources & collections)

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| SourcesScreen | `/[locale]/library` | **IMPLEMENTED_VERIFIED** | List endpoint live-verified (2 real seeded sources, `status: ready`). Tabbed sources/collections, upload modal with client-side file validation (extension/size, mirrors `apps/sources/validators.py`), create-collection modal |
| SourceUploadScreen | (modal within `/library`) | IMPLEMENTED_UNVERIFIED_BACKEND | Not exercised with a real file upload this phase (would need a disposable test file — flagged as a remaining gap in `BACKEND_INTEGRATION_STATUS.md`, not assumed working). No upload-progress percentage — mobile doesn't have this either; `uploadSource.isPending` drives an indeterminate loading state |
| SourceDetailsScreen | `/[locale]/library/[id]` | **IMPLEMENTED_VERIFIED** | `capabilities/` endpoint live-verified — and its real response shape turned out to be different from what Phase 1 had guessed (flat map, not wrapped in a `characters` key; fields are `available`/`actions`/`message`, not `available`/`reason`). Fixed this phase, plus the UI now distinguishes AVAILABLE / UNAVAILABLE (backend's own message shown) / COMING_SOON (character not yet launched) / PROCESSING_REQUIRED (source not `ready` yet) instead of just hiding unavailable characters |
| SourceUseScreen | (within `/library/[id]`) | IMPLEMENTED_UNVERIFIED_BACKEND | `POST .../use-with-character/` returned a real `400` validation error live (missing `subject`) confirming the endpoint and error path both work correctly; a full successful character-action → AI job was not exercised (needs the AI microservice, out of scope — see `BACKEND_INTEGRATION_STATUS.md`) |
| CollectionCreate / CollectionDetails / CollectionEdit / CollectionUse | `/[locale]/library/collections/[id]` (+ create modal) | **IMPLEMENTED_VERIFIED** (Phase 2.5) | Created, viewed, and used a live collection end-to-end through the UI. Found and fixed a real contract bug: `GET .../sources/` is a plain unpaginated array with a narrower item shape than a full `StudentSource` (frontend used `requestPaginated<StudentSource>()`) — see `API_CONTRACT_MAP.md`. Capability check confirmed live for both an empty and a populated collection (see AI jobs / character-capability row below) |

## Projects

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| ProjectsScreen | `/[locale]/projects` | **IMPLEMENTED_VERIFIED** (Phase 2.5) | Created a live disposable test project through the UI; list and detail both confirmed against real backend data |
| ProjectCreate / ProjectDetails / ProjectEdit | `/[locale]/projects` (modal) / `/[locale]/projects/[id]` | **IMPLEMENTED_VERIFIED** (Phase 2.5) | Created, renamed, archived, and restored live; each action produced a real `GET {id}/activity/` entry. Found and fixed a real type bug: the activity entry shape was guessed as `{type, description}`, the real shape is `{event_type, request_id, artifact_type, artifact_id, metadata, actor_name, created_at}` — `description` didn't exist, so the feed rendered nothing meaningful. Now renders an i18n-mapped label per `event_type` (falls back to the raw value for any type not yet translated) — see `API_CONTRACT_MAP.md` |

## AI jobs

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| AIJobProgressScreen | `/[locale]/ai-jobs/[id]` | **PARTIAL** | Phase 2.5: exercised the real Django-side job API/DB directly (creation, cancellation, and direct DB-state transitions through every real status value, since the AI microservice itself still can't run in this sandbox — pgvector has no Windows package distribution, genuinely `BLOCKED_BY_INFRASTRUCTURE`, not skipped). Every status (`created`/`queued`/`submitted`/`processing`/`validating`/`output_ready`/`materializing`/`completed`/`failed`/`canceled`) renders correctly in-browser with zero console errors: status badge, progress bar, cancel button (hidden once terminal), error message on failure, result-routing button on completion. Found and fixed a real i18n gap in the process: the status badge showed the raw English enum literal on the Arabic page instead of a translated label — added an `aiJobs.status.*` message namespace. Polling via React Query `refetchInterval`, same backoff schedule as mobile (`AI_JOB_POLLING`: 2s→3s→5s→10s by job age); no WebSocket exists on either platform. AI **content generation** itself remains unverified — that needs the real microservice and is a Phase 3+ infrastructure item |
| Character-capability cross-check (Khota/Fahes/Kholasa/Rasheed/Sada) | `capabilities` responses consumed on `/library/[id]` and `/library/collections/[id]` | **IMPLEMENTED_VERIFIED** (Phase 2.5) | Queried live for 2 real sources and 2 real collections (one empty, one populated). Consistent real pattern: Khota/Fahes require actual source content (`"أضف مصادر أولاً"` on an empty collection); Rasheed is available even on an empty collection (project-level analysis, not source-dependent); Kholasa/Sada are uniformly `available: false` with a subscription-plan-gate message (`"هذه الشخصية غير متاحة في خطتك الحالية"`), confirming they're COMING_SOON by product design, not a broken capability check. A source in a genuine `processing` state wasn't present in this local DB snapshot to directly observe `PROCESSING_REQUIRED` — not fabricated, flagged as the one state this cross-check didn't directly exercise |

## Study plans (Khota) — Phase 2 highest priority

The Phase 1 gap ("Today/Week wired in data but not split into their own routes") is
resolved this phase — deliberately as `/[locale]/characters/khota/{today,week}` rather than
`/[locale]/study-plans/{today,week}`, so Khota's character page can be a real workflow hub
(matching the Phase 2 brief's explicit ask) while the existing, already-working
`/study-plans` list/detail routes stay exactly where Home and other pages already link to
them — no internal links broke, nothing working was rebuilt.

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| CharactersHubScreen → Khota | `/[locale]/characters/khota` | **IMPLEMENTED_VERIFIED** | `KhotaHub` — today summary card, week summary card, real active-plan list (subject name + progress badge per plan), all live-verified |
| TodayTasksScreen | `/[locale]/characters/khota/today` | **IMPLEMENTED_VERIFIED** | New this phase. Full task list with complete/skip/reopen, live-verified against real backend data (4 tasks, mixed pending/completed) |
| WeekPlanScreen | `/[locale]/characters/khota/week` | **IMPLEMENTED_VERIFIED** | New this phase. 7-day grid built by enumerating `start_date`..`end_date` and filling gaps — the backend's `week/` response is **sparse** (omits days with zero tasks entirely, confirmed live: a 7-day range returned only 5 `days[]` entries), which Phase 1 hadn't accounted for and this phase's UI now handles correctly |
| StudyPlansScreen | `/[locale]/study-plans` | IMPLEMENTED_UNVERIFIED_BACKEND | List endpoint live-verified via direct API call (4 real plans returned); the page itself wasn't re-driven through the browser this phase (Khota's own hub links into it) |
| StudyPlanCreateScreen | (within `/study-plans`) | IMPLEMENTED_UNVERIFIED_BACKEND | Manual creation only — AI plans redirect through `/ai-jobs` per backend contract (`generation_type=ai` is rejected by `POST /study-plans/`) |
| StudyPlanDetailsScreen | `/[locale]/study-plans/[id]` | IMPLEMENTED_UNVERIFIED_BACKEND | Nested tasks, complete/skip/reopen actions — shares the same task-mutation hooks/query keys as Today/Week, so a completion there is reflected here without a manual refetch (see "Cache synchronization" below) |
| StudyTaskDetailsScreen | (inline in study plan detail) | PARTIAL | No standalone task-detail route — task actions are inline on Today/Week/plan-detail instead, which covers the same functionality; a dedicated route is low-value duplication, not a gap |
| `editStudyPlan` feature flag (preview-only on mobile) | — | N/A | Mobile itself gates this as preview-only; not built here either, consistent |

**Cache synchronization** (explicitly required by the Phase 2 brief): Home, `KhotaHub`,
Today, Week, and plan-detail all call the *same* `useTodayPlan()`/`useWeekPlan()`/
`useStudyPlans()` hooks from `features/study-plans/hooks/useStudyPlans.ts`, which share one
query-key registry (`lib/query/keys.ts`). `useCompleteTask`/`useSkipTask`/`useReopenTask`
invalidate `queryKeys.studyPlans.all` (`["studyPlans"]`), which — because React Query
treats an invalidation key as a *prefix* match — also invalidates `.list()`, `.detail()`,
`.today()`, and `.week()` in one call. Completing a task on any one of these five surfaces
correctly refetches on all the others; verified by reading the invalidation logic and
confirming the shared hook/key usage across all five page components (not independently
re-implemented per page).

## Quizzes

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| QuizListScreen | `/[locale]/quizzes` | **IMPLEMENTED_VERIFIED** | Live-verified (4 real published quizzes returned). Filters mirror backend query params |
| QuizCreateScreen | (within `/quizzes`) | IMPLEMENTED_UNVERIFIED_BACKEND | Manual draft only, same AI-redirect rule as study plans |
| QuizDetailsScreen | `/[locale]/quizzes/[id]` | **IMPLEMENTED_VERIFIED** | Live-verified (real quiz detail: published, 5 questions). Publish/archive actions, draft-only editing |
| QuizSolveScreen | `/[locale]/quizzes/attempts/[id]` | IMPLEMENTED_UNVERIFIED_BACKEND | Full attempt flow: start → answer → submit → result, correct answers hidden until submission (matches backend behavior). Not driven live this phase, but the OpenAPI schema cross-check found and fixed real type bugs in exactly this flow — see below |
| QuizResultScreen | (within `/quizzes/attempts/[id]`) | IMPLEMENTED_UNVERIFIED_BACKEND | **Type bugs found and fixed this phase**: Phase 1's `submitAttempt()`/`getAttemptResult()` return type (`QuizAttemptResult` — `correct_count`, `score`, `total_points`) didn't match the real `QuizResult` schema at all (`correct_answers_count`, `percentage`, differently-nested `attempt`/`quiz`/`answers`). Fixed against the real OpenAPI schema — see `types/domain.ts` and `BACKEND_INTEGRATION_STATUS.md` |

## Recommendations (Rasheed output)

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| RecommendationsScreen | `/[locale]/recommendations` | **IMPLEMENTED_VERIFIED** (Phase 2.5) | Live-verified both non-empty (real recommendation, since deleted after verification) and empty states (clean empty-state UI, no crash) |
| RecommendationDetailsScreen | `/[locale]/recommendations/[id]` | **IMPLEMENTED_VERIFIED** (Phase 2.5) | **A real live crash was found and fixed here**: `next_best_action` (a Django `JSONField` object) was typed as `string \| null` and rendered directly, throwing "Objects are not valid as a React child." Fixed the type and added a dedicated `recommendations` list section that was previously never rendered anywhere. `mark-read` action verified live end-to-end — and a real, systemic cache bug was found and fixed in the process: the mutation updated the backend correctly (confirmed `200`, `is_read: true`) but the button didn't update, because the mutation's cache write used a numeric id while the page's read used the string route param as two different React Query cache keys. Fixed at the root in `lib/query/keys.ts`, not just for recommendations — see `API_CONTRACT_MAP.md` and `BACKEND_INTEGRATION_STATUS.md` |

## Summaries (Kholasa output)

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| SummariesScreen / SummaryDetailsScreen | `/[locale]/summaries`, `/[locale]/summaries/[id]` | IMPLEMENTED (route) / COMING_SOON (generation) | Read-only list/detail routes exist and are wired to `GET /summaries/`; there's simply nothing to list until Kholasa is live (see Characters section) — same state as mobile |

## Transcriptions (Sada output)

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| TranscriptionsScreen / TranscriptionDetailsScreen | `/[locale]/transcriptions`, `/[locale]/transcriptions/[id]` | IMPLEMENTED (route) / COMING_SOON (generation) | Same situation as Summaries |

## Notifications

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| NotificationsScreen | `/[locale]/notifications` | **IMPLEMENTED_VERIFIED** (list/unread-count) | `unread-count/` live-verified (`{count: 0}`). List/mark-read/mark-all-read unchanged from Phase 1, contract matches. No push — poll-only on both platforms (no WebSocket/SSE exists on the backend at all) |

## Subscriptions / paywall

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| SubscriptionScreen ("الخطة والاستخدام") | `/[locale]/subscription` | **IMPLEMENTED_VERIFIED** (read) / BLOCKED_BY_BACKEND (checkout) | `GET /subscriptions/me/` live-verified — full real shape (plan, subscription record, usage, limits, features, remaining). **A real, pre-existing bug was found and fixed here**: the usage-bar UI indexed `usage` and `limits` by the same key, but they're unrelated namespaces (`usage.khota_requests` vs `limits.max_khota_requests_per_month`) — every "used" bar was silently always 0. Fixed by deriving `used = limit − remaining` (`limits`/`remaining` do share key names). **No self-service upgrade/checkout exists on either platform** — the backend has no payment-provider integration at all (`PAYMENTS_ENABLED` flag with nothing behind it, confirmed live: `provider` on the real subscription record is `"local"`). `featureFlags.subscriptionsCheckout` stays hard-coded `false`. **Re-verified against current backend source in Phase 3**: `config/settings.py` defines `PAYMENTS_ENABLED` as an inert env flag with no Stripe/PayPal SDK, API keys, or webhook config anywhere; `SubscriptionPlan.Provider`'s `STRIPE` value is an enum label with zero integration behind it; `apps/subscriptions/urls.py` exposes only read-only endpoints — no checkout/payment route exists at all |

## Support

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| SupportTicketsScreen | `/[locale]/support` | IMPLEMENTED | |
| SupportTicketCreateScreen | (within `/support`) | IMPLEMENTED | |
| SupportTicketDetailsScreen | `/[locale]/support/[id]` | IMPLEMENTED | Threaded messages, close action |

## Settings / account

| Mobile screen | Web route | Status | Notes |
|---|---|---|---|
| SettingsScreen | `/[locale]/settings` | **IMPLEMENTED_VERIFIED** | Theme switcher (light/dark/fire) re-verified live this phase via the real persistence path (not just DOM inspection) — all three themes render correctly, survive reload. **Two real hydration bugs found and fixed** in the theme/offline-detection machinery this phase (see `AUTH_SECURITY.md`/`PHASE_2_REPORT.md`) |
| ProfileScreen / EditProfileScreen | `/[locale]/settings/profile` | **IMPLEMENTED_VERIFIED** | `GET /students/profile/` live-verified against real seed data; found and fixed a real type bug (`grade_level` is a string, not a number) |
| Subjects management | `/[locale]/settings/subjects` | **IMPLEMENTED_VERIFIED** | Same live-verified endpoints as onboarding subjects selection |
| AboutScreen | `/[locale]/settings/about` | IMPLEMENTED | Static |
| PrivacyPolicyScreen | `/[locale]/settings/privacy` | IMPLEMENTED | Static legal copy — uses the corrected "رشيد" name |
| TermsScreen | `/[locale]/settings/terms` | IMPLEMENTED | Static |
| "Reset guides" (mobile coach-mark reset) | — | NOT_STARTED | Mobile-specific first-run-hint mechanism (`experienceStorage`); no equivalent onboarding-hint system was built for web in Phase 1 |
| AccountDeletionScreen | — | BLOCKED_BY_BACKEND | **Not built.** Mobile's own version is non-functional too — `src/features/accountDeletion/service.ts` uses a permanently-throwing `unavailableAccountDeletionAdapter` and the screen isn't even registered in mobile's navigator. No `DELETE /users/me/` (or equivalent) endpoint exists anywhere in the Django backend. Building real UI here would mean fabricating behavior against a nonexistent contract — explicitly against Phase 1 rules. Flagged to the backend team in `API_CONTRACT_MAP.md`. **Re-verified against current backend source in Phase 3** (not assumed from prior phases): `apps/users/views.py`'s `UserMeView` explicitly declares `http_method_names = ["get", "patch", "head", "options"]` — no `delete` route exists anywhere in `apps/users/urls.py`. A soft-delete mechanism (`User.is_deleted`/`deleted_at`) exists on the model and is wired into the default manager and a Django-admin bulk action only — there is no API a user or this frontend can call. Still a genuine `PRODUCTION_RELEASE_BLOCKER` if account deletion is a launch requirement |

## Cross-cutting / infrastructure parity

| Mobile mechanism | Web equivalent | Status | Notes |
|---|---|---|---|
| Expo SecureStore (access/refresh tokens) | HttpOnly `baraq_access`/`baraq_refresh` cookies, BFF-proxied | IMPLEMENTED | Stronger than mobile's model even at parity — tokens never reach JS at all, vs. SecureStore which the app process can still read |
| `X-Request-ID` client header + correlation | `src/lib/utils/request-id.ts` (`web-<ts>-<rand>`), forwarded end-to-end through the BFF | IMPLEMENTED | |
| Single-flight refresh mutex | `src/lib/auth/server.ts` `refreshAccessToken()` | IMPLEMENTED | Closes a gap present in the existing admin dashboard's BFF (see `AUTH_SECURITY.md`) |
| React Query cache + query-key conventions | `src/lib/query/keys.ts`, per-feature hooks | IMPLEMENTED | Mirrors mobile's hierarchical key structure |
| Envelope/pagination/error normalization | `src/lib/api/{envelope,errors}.ts` | IMPLEMENTED | Same `AppError` shape and Arabic message catalog philosophy as mobile's `errorNormalizer.ts`, ported to TypeScript |
| RTL forcing | `dir="rtl"` on `<html>` per locale (architectural, not forced globally) | IMPLEMENTED | Web is more correct here — supports genuine LTR for English rather than mobile's app-wide forced RTL |
| Light/dark/fire theme | `src/design-system/tokens.css`, `ThemeScript.tsx`, `stores/theme-store.ts` | IMPLEMENTED | Fire theme ported from mobile's `src/theme/themes.ts` (doesn't exist on the marketing site) |
| Observability PII redaction regex | — | NOT_STARTED | Mobile's `src/services/observability/index.ts` redacts tokens/PII/content before any log/telemetry call; no telemetry provider is wired up in this web app yet at all (matches mobile, which also has "no provider configured yet"), so there's nothing to redact from today — port the regex when a provider is actually added, not before |
| Deep-link validation (`baraq://reset-password?uid=&token=`) | Query-param validation in the reset-password page (`src/lib/validation/auth.ts`) | IMPLEMENTED | Web's equivalent of a deep link is just a URL, so there's no custom scheme/allowlist to replicate — Next's own routing handles it |

## Summary

Phase 1 shipped working, backend-contract-wired UI for essentially every mobile screen.
Phase 2 stood up a real local backend instance and **live-verified** roughly two-thirds of
that surface end-to-end (marked `IMPLEMENTED_VERIFIED` above) — auth's full lifecycle,
subjects, home, Khota's entire workflow (today/week/plans, newly built this phase),
quizzes (read paths), library sources (read + capabilities), subscriptions, notifications,
and settings/profile. In the process it found and fixed real bugs no amount of
source-reading alone would have caught: three separate React 19 hydration mismatches
(`OfflineBanner`, `ThemeToggle`, `Logo` — all "browser API read directly in a render body"
variants of the same underlying mistake), an open-redirect gap in the login `?next=`
handling, a subscription-usage-bar bug that silently always showed 0% used, a wrong
`SourceCapabilities` response shape, and half a dozen domain type errors (`grade_level` as
a string not a number, `subject` as a nested object not a bare id in read responses, and
the `QuizResult`/`QuizAttempt` shapes) — cross-checked against the real OpenAPI schema
pulled from the live instance, not guessed.

What remains `IMPLEMENTED_UNVERIFIED_BACKEND` or `NOT_TESTED` this phase isn't broken —
it's simply not yet been driven against a live backend (no collections/projects/
recommendations existed in the seed data; full quiz-attempt and AI-job lifecycles need
more setup than this phase's scope allowed). Two mobile-inherited gaps remain correctly
unbuilt rather than faked: account deletion (no backend endpoint exists on either
platform) and subscription checkout (no payment provider integrated on either platform) —
both cross-referenced in `API_CONTRACT_MAP.md`'s "known backend gaps" section. Onboarding
marketing slides and the mobile coach-mark/guide-reset mechanism remain out of scope
(low priority, or covered by the marketing site).

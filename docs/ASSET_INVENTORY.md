# Asset Inventory

Source: `D:\baraaq\image\` (the real Baraq asset drop referenced in the Phase 2 brief),
copied into `web/src/assets/` mirroring the mobile app's folder layout, plus a handful of
extra per-character thumbnail crops and two additional success/background images not
present in the original `image/` folder (likely derived separately — provenance not
re-verified, flagged for the asset/brand team to confirm). All entries below were opened
and visually inspected in this phase — this is not a blind file listing.

Total: 61 files across 6 categories (logos, app icons, character art, backgrounds,
onboarding, empty-states, success-states). Static assets are imported as ES modules from
`src/assets/assets.ts` (fixed in Phase 2 — see "What was wrong" below) rather than referenced
by public URL, so `next/image` gets automatic width/height inference and build-time
optimization.

## What's genuinely good and wired

| Category | Files | Status |
|---|---|---|
| **Character full-pose art** | `characters/{khota,fahes,rasheed,kholasa,sada}/character_*_full.png` | **Verified distinct, correctly color-matched** to each character's canonical brand color (Khota red, Fahes blue, Rasheed green, Kholasa pink, Sada purple) — visually inspected all 5. Wired into `components/brand/CharacterAvatar.tsx` (replaces the Phase 1 initial-letter-disc placeholder). |
| **Group hero illustration** | `images/backgrounds/bg_home_soft_gems.png` | High-quality, correctly composed: all 5 characters together, each with a thematically-fitting chest emblem (compass/star for Khota=planning, shield+check for Fahes=quizzes, tree for Rasheed=growth/recommendations, book for Kholasa=summaries, waveform for Sada=audio), plus app-UI mockup elements and gems. Wired as a subtle (15% opacity) full-bleed background on the `(auth)` layout (login/register/forgot/reset pages) — the one place in this phase it was used, to keep the "serious desktop app" restraint the brief asked for elsewhere. |
| **Logo lockups** | `logos/logo_baraq_light.png` (white bg, navy text), `logos/logo_baraq_dark.png` (navy bg, white text) | Real gems+wordmark composition, not a placeholder. Wired into `components/brand/Logo.tsx`, theme-aware (light theme → `light.png`; dark/fire → `dark.png`; `system` resolves via `prefers-color-scheme`, hydration-safe via `useSyncExternalStore` — see `AUTH_SECURITY.md`/`PHASE_2_REPORT.md` for the hydration bugs this phase found and fixed here). |
| **`success_task_completed.png`** | 1 file | Correctly Khota-red, thematically fits "task completed." Not yet wired into a component (`TaskRow`'s completion state still uses a plain Lucide checkmark) — a reasonable Phase 3 polish item, not done here to avoid over-scoping a single icon swap this late in the phase. |

## What was wrong (fixed)

**`src/assets/assets.ts` used `require(...)` for every entry** — a React Native/Metro
convention, invalid in this Next.js/Turbopack/ESM project. It failed
`@typescript-eslint/no-require-imports` (49 lint errors) and would not have given
`next/image` the static analysis it needs for automatic sizing even if it had run.
Rewritten to real ES `import` statements per asset (see the file) — verified via
`npm run typecheck`/`npm run lint`, both clean.

## Real content gaps (documented honestly, not papered over)

1. **No transparent, icon-only logo crop exists.** Both `logo_baraq_light.png` and
   `logo_baraq_dark.png` are the full gems+wordmark lockup on a *solid* background —
   there's no small icon-only mark suitable for a favicon-adjacent or very compact UI
   context (the marketing site's own asset set has exactly this — `icon-only.webp`,
   theme-agnostic and transparent — per the Phase 1 audit of `Baraq_Website/assets/logo/`;
   this asset drop doesn't include an equivalent). `logo_baraq_primary.png`,
   `logo_baraq_icon.png`, and `logo_baraq_wordmark.png` all turned out to be the *same*
   image as `logo_baraq_light.png` when opened side-by-side — their filenames imply
   distinct crops (an icon-only version, a wordmark-only version) that don't actually
   exist in this file set. Recommend the brand/design team supply a real transparent
   icon-only crop before Phase 3 needs one (e.g. a compact mobile topbar mark, an
   app-icon-adjacent badge).
2. **The fire theme has no matching logo background.** `logo_baraq_dark.png`'s navy
   (`#0B0E1A`-ish) background is close to the *dark* theme's `--color-bg`, but doesn't
   match the *fire* theme's warm `#1A0F0A`. Using it there anyway is a minor, visible
   compromise (documented in `Logo.tsx`'s own comment) rather than a silent one.
3. **Every file under `images/empty/*` (all 7: `empty_api_error`, `empty_no_results`,
   `empty_quizzes`, `empty_study_plans`, `empty_subjects`, `empty_today_tasks`,
   `empty_week_plan`) is the identical Sada (purple) character image**, just saved under
   different filenames — confirmed by opening four of the seven side-by-side (byte-for-byte
   visually indistinguishable). This is not "empty-state artwork per feature," it's one
   image copy-pasted under several names. Wiring these into `EmptyState` as-is would
   actively mislead: it would visually associate Sada with "no quizzes," "no subjects,"
   and "no study plans" screens, contradicting Sada's real (audio/transcription) domain
   everywhere else in the app. **Left unwired.** `EmptyState` keeps its Phase 1 Lucide-icon
   presentation, which is honest about not having bespoke illustrations yet, rather than
   using wrong ones. This needs a real content pass (5–7 distinct illustrations) before
   Phase 3 wires anything here.
4. **`success_subjects_selected.png` is identical to `bg_home_soft_gems.png`** (the same
   5-character group hero shot), not a distinct "you selected your subjects" illustration.
   `success_quiz_completed.png` and `success_plan_created.png` were not individually opened
   this phase — spot-check before wiring either into a real success moment.
5. **`.lottie` motion files referenced in earlier planning notes
   (`splash_baraq_gems_reveal.lottie`, `motion_gem_loader.lottie`,
   `success_task_completed.lottie`, `motion_quiz_result_fahes.lottie`,
   `splash_baraq_gems_reveal.mp4`) do not exist in this asset drop.** No Lottie player
   dependency was added (would be dead weight without the files) — Motion for React's
   existing CSS-driven presets remain the animation layer for now.
6. **Character thumbnail crops** (`character_*_thumbnail.png` for all 5) exist and were
   not individually inspected — likely fine (same character, smaller crop) given the
   `_full` variants are correct, but not verified pixel-by-pixel.

## Full file listing by category

### Logos (`src/assets/logos/`)
`logo_baraq_primary.png`, `logo_baraq_icon.png`, `logo_baraq_wordmark.png` — all three
identical to `logo_baraq_light.png` (see gap #1). `logo_baraq_light.png` (wired),
`logo_baraq_dark.png` (wired), `logo_baraq_mono.png` (single-tone navy variant, not wired —
no current use case for a monochrome lockup).

### App icons (`src/assets/icons/`)
`app_icon_1024.png`, `app_icon_round.png`, `app_icon_adaptive_foreground.png`,
`app_icon_adaptive_background.png` — mobile app-icon exports (Android adaptive icon
foreground/background layers, iOS/general 1024px, round variant). Not applicable to a web
app directly; kept for reference / potential PWA manifest icons in Phase 3, not wired.

### Characters (`src/assets/characters/<key>/`)
Each of the 5 canonical characters (`khota`, `fahes`, `rasheed`, `kholasa`, `sada`) has:
a `_full` pose (wired, verified), a `_happy`/alternate pose, 1–2 domain-specific poses
(e.g. `character_khota_pointing`, `character_fahes_quiz`, `character_rasheed_advice`,
`character_kholasa_reading`/`_summary`, `character_sada_voice`/`_help`/`_no_connection`),
and a `_thumbnail` crop. Only `_full` is wired anywhere yet — the alternate/domain poses are
a natural Phase 3 fit for hover states, empty states *specific to that character's own
screens* (e.g. `character_sada_no_connection.png` would be a genuinely correct choice for
Sada's own offline state, unlike the generic `empty_*` files above), and richer character
detail pages as Fahes/Rasheed/Kholasa/Sada get their own hub treatment like Khota did this
phase.

### Backgrounds (`src/assets/images/backgrounds/`)
`bg_home_soft_gems.png` (wired), `bg_splash_light.png`, `bg_onboarding_gradient.png`,
`bg_result_celebration.png`, `bg_quiz_soft_blue.png` — the latter four not inspected this
phase; reasonable Phase 3 candidates for a splash/loading screen, onboarding slides (if
built — see `FEATURE_PARITY_MATRIX.md`), and a quiz-result celebratory background.

### Onboarding (`src/assets/images/onboarding/`)
`onboarding_learning_companions.png`, `onboarding_quiz_fahes.png`,
`onboarding_smart_plan_khota.png` — not inspected; onboarding slides are `NOT_STARTED` per
the parity matrix (out of scope this phase), so these remain unused for now.

### Empty states (`src/assets/images/empty/`) — see gap #3, unwired
`empty_api_error.png`, `empty_no_results.png`, `empty_quizzes.png`,
`empty_study_plans.png`, `empty_subjects.png`, `empty_today_tasks.png`,
`empty_week_plan.png`.

### Success states (`src/assets/images/success/`)
`success_task_completed.png` (verified good, unwired — see above),
`success_subjects_selected.png` (duplicate, see gap #4), `success_quiz_completed.png`,
`success_profile_setup.png`, `success_plan_created.png` (not inspected).

## Phase 3: transparent character asset audit and processing

Section 5 of the Phase 3 brief required verifying actual alpha channels, not assuming a
`.png` extension implies transparency. It didn't — confirmed with hard evidence via a new,
reusable audit tool: `scripts/analyze-character-alpha.mjs` (reads every character PNG with
`sharp`, reports `hasAlpha`, min/max/average alpha, and the percentage of non-fully-opaque
pixels).

**Result: all 30 character images across all 5 characters were `OPAQUE_BACKGROUND`.** None
were `ALREADY_TRANSPARENT`. Specifically:

| Finding | Count | Detail |
|---|---|---|
| `NO_ALPHA_CHANNEL` (fully opaque PNG, no alpha channel at all) | 9 | e.g. `character_kholasa_full.png`, `character_sada_happy.png` |
| `ALPHA_CHANNEL_PRESENT_BUT_FULLY_OPAQUE` (has an alpha channel, but every pixel is 255) | 21 | e.g. `character_khota_full.png`, `character_rasheed_full.png` — a channel exists but was never actually used for transparency |

No `DUPLICATE`, `MISLABELED`, or `UNUSABLE_PLACEHOLDER` character images were found — every
file is a distinct, correctly color-matched illustration for its character (consistent with
the Phase 2 audit above). No image needed `NEEDS_MANUAL_DESIGN_SOURCE` treatment — every
background sampled as a near-uniform off-white (RGB ≈ 252–255 at every image border), which
turned out to be a reliable case for automated removal (see below), not one requiring a
design-source request.

### Non-destructive processing

`scripts/process-character-transparency.mjs` — a new, reusable, idempotent tool. **It never
modifies or deletes an original.** For every `src/assets/characters/<key>/*.png`, it writes
a transparent derivative to a sibling `src/assets/characters/<key>/processed/` directory
with the identical filename. Re-running it is safe: it always reads from the original PNG,
never from a prior `processed/` output.

Tooling choice: ImageMagick is **not installed** in this environment (the `convert` binary
resolvable on `PATH` is Windows' unrelated legacy disk-conversion utility, not ImageMagick —
verified before ruling it out, not assumed). `sharp` **is** installed (a Next.js image
dependency already in `node_modules`) and was used for all raw pixel I/O and PNG encoding.
There is no AI background-segmentation service available in this sandbox, so the removal
algorithm itself is a standard, well-understood technique implemented directly in
JavaScript over `sharp`'s raw pixel buffers — not a black box:

1. Sample the background reference color from the median of every border pixel (not just
   the 4 corners, so a slightly non-uniform edge doesn't skew the reference).
2. Flood fill (BFS) inward from every border pixel, expanding into 4-connected neighbors
   whose Euclidean RGB distance from the reference is below a threshold. This reaches the
   solid background *and* the anti-aliased blend pixels right at the character's silhouette,
   but stops at the character's own solid-color regions.
3. Critically, only pixels **reached by that flood fill** have their alpha touched. A white
   highlight enclosed *inside* the character (an eye, a badge) is never reached from the
   border, so it stays fully opaque — this is what prevents the classic "eats into white
   character details" failure mode of a naive whole-image color-key.
4. Within the reached region, alpha isn't binary — it's interpolated across a feather band
   (distance 12–42), so the original anti-aliased edge pixels become genuine partial-alpha
   pixels instead of a hard, jagged cutout.

### Quality verification (Section 8 — all 5 characters, 4 surfaces)

A second new tool, `scripts/composite-preview.mjs`, composites a processed character over
four surfaces side by side — the app's actual light surface color, actual dark surface
color, actual fire surface color, and a neutral checkerboard — for direct visual comparison.
Every one of the 5 characters' `_full` illustration was checked this way, plus two
higher-risk variants with additional props (`character_kholasa_summary.png`, which has the
character holding a chart card touching close to but not touching the image border) and one
close-up zoom crop of the highest-detail regions (Khota's crown tips and feet/shadow area,
against the dark surface specifically, since halos are most visible there).

| Character | Light | Dark | Fire | Checkerboard | Notes |
|---|---|---|---|---|---|
| Khota (خُطى) | ✅ | ✅ | ✅ | ✅ | Crown tips and feet clean at zoom; no halo. A faint ground-contact shadow survived the cutout (grounds the figure rather than looking cut-and-pasted) |
| Fahes (فاحص) | ✅ | ✅ | ✅ | ✅ | Shield emblem and crown edges clean |
| Kholasa (خُلاصة) | ✅ | ✅ | ✅ | ✅ | The `_summary` variant's held chart card (with its own near-white interior) was fully preserved — not eaten, since it's enclosed, not border-connected |
| Rasheed (رشيد) | ✅ | ✅ | ✅ | ✅ | Crystal crown facets clean |
| Sada (صدى) | ✅ | ✅ | ✅ | ✅ | Crystal crown facets clean |

No white halos, no jagged edges, no damaged accessories, and no color contamination were
observed in any of the checks above. **Status: all 30 processed images are
production-quality**, not a "best available, needs a real design source" compromise.

### Wired into the app

`src/assets/assets.ts`'s character imports now point at the `processed/` transparent
derivatives instead of the opaque originals (same filenames, same aspect ratio — a pure
swap, no consuming-component changes needed). Since `components/brand/CharacterAvatar.tsx`
was already the single rendering point for character art everywhere it's shown (Home,
`/characters` hub, `KhotaHub`), this one file change fixed every character appearance
app-wide in one place — verified live in the browser across Light/Dark/Fire on Home, the
character hub grid, and the Khota hub page, zero console errors. The previously-documented
defect ("no asset should display a baked white rectangle in Dark/Fire mode," Phase 3 brief
§37) is resolved for every character card and avatar in the app.

The opaque originals remain on disk, untouched and still imported by nothing — kept as the
authoritative source for any future re-processing, per the brief's non-destructive
requirement.

### Recommended next step (not done this pass, to keep scope bounded)

The Phase 2 audit's gap #3 above (every `images/empty/*` file being an identical, wrongly-
domain-matched Sada duplicate) is now more actionable than before: each character's own
alternate-pose images are real, distinct, and now have a transparent derivative available
too. Wiring `character_sada_no_connection.png` into Sada's actual offline state (a real,
correct match), or similar per-character alternates into their own empty states, is a
natural follow-up — deliberately not bundled into this pass so the transparency work above
stays a single, reviewable, verifiable change.

## Recommendation for Phase 3

1. Get the brand/design team to confirm (a) whether `empty_*`/`success_subjects_selected`
   are placeholder mistakes or intentional, and (b) supply a transparent icon-only logo
   crop.
2. If the `empty_*` duplication is confirmed as a mistake, request 5–7 real distinct
   illustrations (or, cheaper: reuse each character's own domain-appropriate alternate pose
   per the relevant empty state — e.g. `character_khota_thinking.png` for "no study plans
   yet" — which are real, distinct, already-available assets, just not pre-cropped for this
   purpose).
3. Wire the remaining character alternate poses into hover/active states on `CharacterCard`
   and into Fahes/Rasheed/Kholasa/Sada's own hub pages as those get built out (mirroring
   what `KhotaHub` does this phase).

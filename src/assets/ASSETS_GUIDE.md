# Baraq Asset Guide

This inventory reflects the assets currently found under `src/assets` and wired for Phase A.

## Found And Wired

### Logos

- `logo_baraq_primary.png`
- `logo_baraq_dark.png`
- `logo_baraq_light.png`
- `logo_baraq_mono.png`
- `logo_baraq_icon.png`
- `logo_baraq_wordmark.png`

### App Icons

- `app_icon_1024.png`
- `app_icon_adaptive_foreground.png`
- `app_icon_adaptive_background.png`
- `app_icon_round.png`

### Characters

#### Khota

- `character_khota_full.png`
- `character_khota_happy.png`
- `character_khota_pointing.png`
- `character_khota_success.png`
- `character_khota_thinking.png`

#### Fahes

- `character_fahes_full.png`
- `character_fahes_happy.png`
- `character_fahes_quiz.png`
- `character_fahes_success.png`
- `character_fahes_thinking.png`

#### Kholasa

- `character_kholasa_full.png`
- `character_kholasa_happy.png`
- `character_kholasa_reading.png`
- `character_kholasa_summary.png`
- `character_kholasa_empty.png`

#### Rasheed

- `character_rasheed_full.png`
- `character_rasheed_happy.png`
- `character_rasheed_advice.png`
- `character_rasheed_pointing.png`
- `character_rasheed_success.png`

#### Sada

- `character_sada_full.png`
- `character_sada_happy.png`
- `character_sada_voice.png`
- `character_sada_help.png`
- `character_sada_no_connection.png`

### Onboarding

- `onboarding_smart_plan_khota.png`
- `onboarding_quiz_fahes.png`
- `onboarding_learning_companions.png`

### Empty States

- `empty_today_tasks.png`
- `empty_week_plan.png`
- `empty_study_plans.png`
- `empty_quizzes.png`
- `empty_subjects.png`
- `empty_no_connection.png`
- `empty_api_error.png`
- `empty_no_results.png`

### Success States

- `success_task_completed.png`
- `success_profile_setup.png`
- `success_subjects_selected.png`
- `success_quiz_completed.png`
- `success_plan_created.png`

### Backgrounds

- `bg_splash_light.png`
- `bg_onboarding_gradient.png`
- `bg_home_soft_gems.png`
- `bg_quiz_soft_blue.png`
- `bg_result_celebration.png`

## Missing From Phase A Required List

- No missing bitmap assets from the requested Phase A list were found.

## Not Wired Yet

- `splash_baraq_gems_reveal.lottie`
- `motion_gem_loader.lottie`
- `success_task_completed.lottie`
- `motion_quiz_result_fahes.lottie`
- `splash_baraq_gems_reveal.mp4`

## Notes

- `src/assets/assets.ts` now exposes both the new grouped structure and backward-compatible paths such as `assets.images.backgrounds.*`.
- No dynamic `require()` calls are used.
- `getAssetOrFallback(asset, fallback)` is available for safe UI fallbacks when a variant should collapse to a guaranteed image.
- Keep `app.json` paths aligned with the icon files above.

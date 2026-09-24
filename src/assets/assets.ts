/**
 * Static asset registry. Every entry is an ES `import` of a real file under
 * `src/assets/` (Next.js/Turbopack resolves these at build time into an
 * optimized `next/image`-compatible object with inferred width/height — the
 * same mechanism `next/image` uses for any statically-imported image).
 *
 * `require(...)` was used here previously — a React Native/Metro convention
 * copied over by habit, invalid in this Next.js/Turbopack/ESM project (it
 * both fails the `no-require-imports` lint rule and does not give
 * `next/image` the static analysis it needs for automatic sizing). Fixed in
 * Phase 2; see docs/ASSET_INVENTORY.md for the full inventory these map to.
 */
import logoBaraqPrimary from "./logos/logo_baraq_primary.png";
import logoBaraqIcon from "./logos/logo_baraq_icon.png";
import logoBaraqWordmark from "./logos/logo_baraq_wordmark.png";
import logoBaraqDark from "./logos/logo_baraq_dark.png";
import logoBaraqLight from "./logos/logo_baraq_light.png";
import logoBaraqMono from "./logos/logo_baraq_mono.png";
import logoBaraqArabicTransparent from "./logos/لوغو بدون خلفية عربي.png";

import bgSplashLight from "./images/backgrounds/bg_splash_light.png";
import bgHomeSoftGems from "./images/backgrounds/bg_home_soft_gems.png";
import bgOnboardingGradient from "./images/backgrounds/bg_onboarding_gradient.png";
import bgResultCelebration from "./images/backgrounds/bg_result_celebration.png";
import bgQuizSoftBlue from "./images/backgrounds/bg_quiz_soft_blue.png";

import onboardingLearningCompanions from "./images/onboarding/onboarding_learning_companions.png";
import onboardingQuizFahes from "./images/onboarding/onboarding_quiz_fahes.png";
import onboardingSmartPlanKhota from "./images/onboarding/onboarding_smart_plan_khota.png";

// Character illustrations: the `processed/` derivatives (Phase 3) — real
// transparent-background cutouts generated non-destructively from these
// exact source files via scripts/process-character-transparency.mjs (a
// border-flood-fill + edge-feather algorithm, verified against every theme
// surface — see docs/ASSET_INVENTORY.md). The opaque originals stay on disk
// untouched and are not imported anywhere; every on-screen usage of a
// character should show correctly on Light/Dark/Fire without a baked white
// rectangle behind it.
import khotaFull from "./characters/khota/processed/character_khota_full.png";
import khotaHappy from "./characters/khota/processed/character_khota_happy.png";
import khotaPointing from "./characters/khota/processed/character_khota_pointing.png";
import khotaSuccess from "./characters/khota/processed/character_khota_success.png";
import khotaThinking from "./characters/khota/processed/character_khota_thinking.png";
import khotaThumbnail from "./characters/khota/processed/character_khota_thumbnail.png";

import fahesFull from "./characters/fahes/processed/character_fahes_full.png";
import fahesHappy from "./characters/fahes/processed/character_fahes_happy.png";
import fahesQuiz from "./characters/fahes/processed/character_fahes_quiz.png";
import fahesSuccess from "./characters/fahes/processed/character_fahes_success.png";
import fahesThinking from "./characters/fahes/processed/character_fahes_thinking.png";
import fahesThumbnail from "./characters/fahes/processed/character_fahes_thumbnail.png";

import rasheedFull from "./characters/rasheed/processed/character_rasheed_full.png";
import rasheedAdvice from "./characters/rasheed/processed/character_rasheed_advice.png";
import rasheedHappy from "./characters/rasheed/processed/character_rasheed_happy.png";
import rasheedPointing from "./characters/rasheed/processed/character_rasheed_pointing.png";
import rasheedSuccess from "./characters/rasheed/processed/character_rasheed_success.png";
import rasheedThumbnail from "./characters/rasheed/processed/character_rasheed_thumbnail.png";

import kholasaFull from "./characters/kholasa/processed/character_kholasa_full.png";
import kholasaEmpty from "./characters/kholasa/processed/character_kholasa_empty.png";
import kholasaHappy from "./characters/kholasa/processed/character_kholasa_happy.png";
import kholasaReading from "./characters/kholasa/processed/character_kholasa_reading.png";
import kholasaSummary from "./characters/kholasa/processed/character_kholasa_summary.png";
import kholasaThumbnail from "./characters/kholasa/processed/character_kholasa_thumbnail.png";

import sadaFull from "./characters/sada/processed/character_sada_full.png";
import sadaHappy from "./characters/sada/processed/character_sada_happy.png";
import sadaHelp from "./characters/sada/processed/character_sada_help.png";
import sadaNoConnection from "./characters/sada/processed/character_sada_no_connection.png";
import sadaVoice from "./characters/sada/processed/character_sada_voice.png";
import sadaThumbnail from "./characters/sada/processed/character_sada_thumbnail.png";

import emptyApiError from "./images/empty/empty_api_error.png";
import emptyNoResults from "./images/empty/empty_no_results.png";
import emptyQuizzes from "./images/empty/empty_quizzes.png";
import emptyStudyPlans from "./images/empty/empty_study_plans.png";
import emptySubjects from "./images/empty/empty_subjects.png";
import emptyTodayTasks from "./images/empty/empty_today_tasks.png";
import emptyWeekPlan from "./images/empty/empty_week_plan.png";

import successQuizCompleted from "./images/success/success_quiz_completed.png";
import successSubjectsSelected from "./images/success/success_subjects_selected.png";
import successTaskCompleted from "./images/success/success_task_completed.png";
import successProfileSetup from "./images/success/success_profile_setup.png";
import successPlanCreated from "./images/success/success_plan_created.png";

import appIcon1024 from "./icons/app_icon_1024.png";
import appIconRound from "./icons/app_icon_round.png";
import appIconAdaptiveForeground from "./icons/app_icon_adaptive_foreground.png";
import appIconAdaptiveBackground from "./icons/app_icon_adaptive_background.png";

export const assets = {
  logos: {
    primary: logoBaraqPrimary,
    icon: logoBaraqIcon,
    wordmark: logoBaraqWordmark,
    dark: logoBaraqDark,
    light: logoBaraqLight,
    mono: logoBaraqMono,
    arabicTransparent: logoBaraqArabicTransparent,
  },
  appIcons: {
    icon1024: appIcon1024,
    round: appIconRound,
    adaptiveForeground: appIconAdaptiveForeground,
    adaptiveBackground: appIconAdaptiveBackground,
  },
  backgrounds: {
    splashLight: bgSplashLight,
    homeSoftGems: bgHomeSoftGems,
    onboardingGradient: bgOnboardingGradient,
    resultCelebration: bgResultCelebration,
    quizSoftBlue: bgQuizSoftBlue,
  },
  onboarding: {
    learningCompanions: onboardingLearningCompanions,
    quizFahes: onboardingQuizFahes,
    smartPlanKhota: onboardingSmartPlanKhota,
  },
  characters: {
    khota: {
      full: khotaFull,
      happy: khotaHappy,
      pointing: khotaPointing,
      success: khotaSuccess,
      thinking: khotaThinking,
      thumbnail: khotaThumbnail,
    },
    fahes: {
      full: fahesFull,
      happy: fahesHappy,
      quiz: fahesQuiz,
      success: fahesSuccess,
      thinking: fahesThinking,
      thumbnail: fahesThumbnail,
    },
    rasheed: {
      full: rasheedFull,
      advice: rasheedAdvice,
      happy: rasheedHappy,
      pointing: rasheedPointing,
      success: rasheedSuccess,
      thumbnail: rasheedThumbnail,
    },
    kholasa: {
      full: kholasaFull,
      empty: kholasaEmpty,
      happy: kholasaHappy,
      reading: kholasaReading,
      summary: kholasaSummary,
      thumbnail: kholasaThumbnail,
    },
    sada: {
      full: sadaFull,
      happy: sadaHappy,
      help: sadaHelp,
      noConnection: sadaNoConnection,
      voice: sadaVoice,
      thumbnail: sadaThumbnail,
    },
  },
  empty: {
    apiError: emptyApiError,
    noResults: emptyNoResults,
    quizzes: emptyQuizzes,
    studyPlans: emptyStudyPlans,
    subjects: emptySubjects,
    todayTasks: emptyTodayTasks,
    weekPlan: emptyWeekPlan,
  },
  success: {
    quizCompleted: successQuizCompleted,
    subjectsSelected: successSubjectsSelected,
    taskCompleted: successTaskCompleted,
    profileSetup: successProfileSetup,
    planCreated: successPlanCreated,
  },
} as const;

export type CharacterAssetKey = keyof typeof assets.characters;

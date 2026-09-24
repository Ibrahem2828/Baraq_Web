/**
 * Canonical Baraq character configuration.
 *
 * This is the single source of truth for character identity in the web app.
 * Names, keys, and colors below are authoritative — do not read character
 * display names from the mobile app's `src/config/constants.ts` or
 * `src/features/characters/data/characters.ts`, which contain a documented
 * inconsistency (see "Known discrepancy" below).
 *
 * Colors are sourced from `Baraq_Website/css/style.css` (`--c-*` tokens),
 * sampled by the brand team directly from the character artwork and the logo —
 * see `docs/DESIGN_SYSTEM.md`.
 */

export type CharacterKey = "khota" | "fahes" | "kholasa" | "rasheed" | "sada";

export interface CharacterDefinition {
  key: CharacterKey;
  /** Canonical Arabic display name. */
  name: string;
  /** Latin transliteration, used in route slugs, analytics, and English copy. */
  slug: string;
  /** Short Arabic role/domain description. */
  role: string;
  /** English role/domain description. */
  roleEn: string;
  /** CSS custom property token name (see design-system tokens). */
  colorToken: `--color-character-${CharacterKey}`;
  /** Whether the character's generation flow is live (vs. "coming soon"). */
  isLive: boolean;
  /** AI job task type this character produces, per the backend contract. */
  taskType:
    | "khota_generate_plan"
    | "fahes_generate_quiz"
    | "kholasa_generate_summary"
    | "rasheed_recommendations"
    | "sada_transcribe_audio";
}

export const CHARACTERS: Record<CharacterKey, CharacterDefinition> = {
  khota: {
    key: "khota",
    name: "خُطى",
    slug: "khota",
    role: "التخطيط الدراسي",
    roleEn: "Study planning",
    colorToken: "--color-character-khota",
    isLive: true,
    taskType: "khota_generate_plan",
  },
  fahes: {
    key: "fahes",
    name: "فاحص",
    slug: "fahes",
    role: "الاختبارات والتقييم",
    roleEn: "Quizzes & assessment",
    colorToken: "--color-character-fahes",
    isLive: true,
    taskType: "fahes_generate_quiz",
  },
  kholasa: {
    key: "kholasa",
    name: "خُلاصة",
    slug: "kholasa",
    role: "التلخيص الذكي",
    roleEn: "Smart summarization",
    colorToken: "--color-character-kholasa",
    // The backend's capability and subscription checks are authoritative.
    // A browser-only rollout flag hid an otherwise working, authorized flow.
    isLive: true,
    taskType: "kholasa_generate_summary",
  },
  rasheed: {
    key: "rasheed",
    name: "رشيد",
    slug: "rasheed",
    role: "تحليل الأداء والتوصيات",
    roleEn: "Performance analysis & recommendations",
    colorToken: "--color-character-rasheed",
    isLive: true,
    taskType: "rasheed_recommendations",
  },
  sada: {
    key: "sada",
    name: "صدى",
    slug: "sada",
    role: "تحويل الصوت إلى نص",
    roleEn: "Voice-to-text",
    colorToken: "--color-character-sada",
    // Sada retains its backend-only audio/source constraints; this only
    // removes the obsolete UI "coming soon" gate.
    isLive: true,
    taskType: "sada_transcribe_audio",
  },
};

export const CHARACTER_LIST: CharacterDefinition[] = [
  CHARACTERS.khota,
  CHARACTERS.fahes,
  CHARACTERS.rasheed,
  CHARACTERS.kholasa,
  CHARACTERS.sada,
];

export function getCharacter(key: CharacterKey): CharacterDefinition {
  return CHARACTERS[key];
}

export function getCharacterByTaskType(
  taskType: CharacterDefinition["taskType"],
): CharacterDefinition | undefined {
  return CHARACTER_LIST.find((character) => character.taskType === taskType);
}

/**
 * Known discrepancy — documented per Phase 1 audit, intentionally NOT propagated:
 *
 * The mobile app (`Baraq-App/src/config/constants.ts:37` and
 * `Baraq-App/src/features/characters/data/characters.ts:57`) uses the generic
 * word "رفيق" ("companion") as the *display name* for the `rasheed` character
 * key, in the character hub, the header nav menu, and the screen title —
 * instead of "رشيد". Meanwhile the mobile app's own Home screen copy and
 * Privacy Policy screen correctly use "رشيد". This is an internal
 * inconsistency in the mobile app, not an intentional rebrand: the character's
 * route/API/type key is uniformly `rasheed` (Latin) everywhere, only the
 * Arabic *display string* varies.
 *
 * The canonical name is **"رشيد"**, per product's character roster, and is
 * used consistently everywhere in this web app. If the mobile app is updated
 * to match, this comment can be removed.
 */
export const RASHEED_LEGACY_DISPLAY_NAME_DISCREPANCY = {
  incorrect: "رفيق",
  canonical: "رشيد",
  foundIn: [
    "Baraq-App/src/config/constants.ts",
    "Baraq-App/src/features/characters/data/characters.ts",
    "Baraq-App/src/components/layout/AppHeaderMenu.tsx",
    "Baraq-App/src/navigation/AppNavigator.tsx",
  ],
} as const;

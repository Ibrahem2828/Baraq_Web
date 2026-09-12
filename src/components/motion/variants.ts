import type { Variants } from "motion/react";

/**
 * Shared motion presets, ported from the mobile app's `src/theme/motion.ts`
 * (`motionDurations`, `motionEasing`, `motionPresets`). Durations are in
 * seconds here (motion/react convention) vs. milliseconds on mobile.
 */
export const motionDurations = {
  instant: 0,
  fast: 0.14,
  normal: 0.22,
  slow: 0.32,
  success: 0.52,
} as const;

export const easeBrand = [0.2, 0.8, 0.2, 1] as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionDurations.normal, ease: easeBrand } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: motionDurations.normal, ease: easeBrand } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: motionDurations.normal, ease: easeBrand },
  },
};

export const staggeredContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export const pressScale = { scale: 0.985 };

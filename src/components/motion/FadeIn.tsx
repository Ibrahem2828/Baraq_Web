"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { fadeIn, slideUp, scaleIn, staggeredContainer } from "./variants";
import { useReducedMotion } from "./useReducedMotion";

type Preset = "fade" | "slide-up" | "scale";

const PRESETS: Record<Preset, typeof fadeIn> = {
  fade: fadeIn,
  "slide-up": slideUp,
  scale: scaleIn,
};

/** Entrance-animates its children once, on mount/in-view. Respects `prefers-reduced-motion`. */
export function FadeIn({
  children,
  preset = "fade",
  className,
  delay = 0,
}: {
  children: ReactNode;
  preset?: Preset;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={PRESETS[preset]}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers its direct children in with the same preset — use for card grids/lists. */
export function StaggerIn({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggeredContainer}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={slideUp}>
      {children}
    </motion.div>
  );
}

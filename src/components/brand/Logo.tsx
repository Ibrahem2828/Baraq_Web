"use client";

import Image from "next/image";
import { assets } from "@/assets/assets";
import { cn } from "@/lib/utils/cn";

/**
 * The approved Arabic lockup has a transparent background, so it remains
 * crisp on light, dark and fire surfaces without a baked rectangle or a
 * client-only theme switch.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={assets.logos.arabicTransparent}
      alt="برّاق"
      height={32}
      className={cn("h-9 w-auto object-contain", className)}
      priority
    />
  );
}

/** Compact mark for tight spaces (currently unused — kept for Phase 3 nav/favicon-adjacent contexts). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--color-accent-solid)] text-lg font-[var(--font-display)] font-extrabold text-[color:var(--color-accent-contrast)]",
        className,
      )}
    >
      ب
    </span>
  );
}

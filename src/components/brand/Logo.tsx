"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { useThemeStore, useHasHydratedThemeStore } from "@/stores/theme-store";
import { assets } from "@/assets/assets";
import { cn } from "@/lib/utils/cn";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function subscribeToColorScheme(callback: () => void) {
  const mql = window.matchMedia(DARK_SCHEME_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Same class of hydration hazard as `useHasHydratedThemeStore` (see that
 * function's comment) — `window.matchMedia(...).matches` read directly in
 * the render body differs between the server (no `window`) and the
 * client's first render, corrupting hydration for any component (this one
 * included) that only cares about the "system" theme preference. Fixed
 * alongside the same real bug found in `OfflineBanner` in Phase 2 — both
 * are `useSyncExternalStore`'s textbook use case, not a coincidence: any
 * direct browser-API read in a render body needs this treatment.
 */
function usePrefersDarkColorScheme(): boolean {
  return useSyncExternalStore(
    subscribeToColorScheme,
    () => window.matchMedia(DARK_SCHEME_QUERY).matches,
    () => false,
  );
}

/**
 * Real logo lockup (Phase 2 — `src/assets/logos/`). Both available files are
 * a full gems+wordmark composition on a solid background — `dark.png` (navy
 * bg, white text) for dark/fire surfaces, `light.png` (white bg, navy text)
 * for the light surface. There is no transparent icon-only or wordmark-only
 * crop in the current asset set (documented as a gap in
 * docs/ASSET_INVENTORY.md); the fire theme's warm background doesn't
 * perfectly match either solid-bg variant, so `dark.png` is used there too
 * as the closer of the two.
 */
export function Logo({ className }: { className?: string }) {
  const preference = useThemeStore((state) => state.preference);
  const hasHydrated = useHasHydratedThemeStore();
  const prefersDark = usePrefersDarkColorScheme();

  const resolved = hasHydrated ? preference : "system";
  const isDarkSurface =
    resolved === "dark" || resolved === "fire" || (resolved === "system" && prefersDark);

  return (
    <Image
      src={isDarkSurface ? assets.logos.dark : assets.logos.light}
      alt="برّاق"
      height={32}
      className={cn("h-8 w-auto", className)}
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

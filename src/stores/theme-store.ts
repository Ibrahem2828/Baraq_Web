"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark" | "fire";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Minimal global client state (theme preference only) — per the architecture
 * guidance, Zustand is used sparingly, not as a general app-state store.
 * Server state (everything from the API) lives in TanStack Query instead.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => {
        set({ preference });
        applyThemeAttribute(preference);
      },
    }),
    { name: "baraq_theme" },
  ),
);

/**
 * zustand's `persist` middleware rehydrates from localStorage synchronously
 * on the client, before React's first client render — so the *server*
 * render (no localStorage) always sees `preference: "system"` while the
 * client's very first render already sees the real persisted value,
 * producing a real hydration mismatch on anything that renders differently
 * per preference (verified against a live dev server in Phase 2 — see
 * `ThemeToggle` and `Logo`, both of which read this). `useSyncExternalStore`
 * — rather than a `useEffect` + `setState` "mounted" flag, which the
 * `react-hooks/set-state-in-effect` lint rule now flags — is the mechanism
 * React itself documents for exactly this "value differs between server and
 * client, driven by an external store" case, with an explicit separate
 * server snapshot. The page's actual colors don't flash either way — those
 * are set imperatively by `ThemeScript` before paint, independent of React.
 */
export function useHasHydratedThemeStore(): boolean {
  return useSyncExternalStore(
    (callback) => useThemeStore.persist.onFinishHydration(callback),
    () => useThemeStore.persist.hasHydrated(),
    () => false,
  );
}

export function applyThemeAttribute(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

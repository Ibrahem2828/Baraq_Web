import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

/**
 * True once the component has hydrated on the client, false during SSR and
 * the client's first render. Use this to gate any value that's only known
 * client-side (an async query result that can resolve before hydration
 * finishes, a browser API) so the first client render matches the server's
 * exactly — a plain `useEffect` + `setState` "mounted" flag causes the same
 * cascading-render the `react-hooks/set-state-in-effect` lint rule flags,
 * and `useSyncExternalStore` is what React itself documents for a value
 * that legitimately differs between server and client (see also
 * `useHasHydratedThemeStore` in `stores/theme-store.ts` and
 * `usePrefersDarkColorScheme` in `components/brand/Logo.tsx`).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

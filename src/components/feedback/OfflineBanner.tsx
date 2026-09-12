"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

/**
 * `navigator.onLine` read directly in a `useState` initializer is not
 * hydration-safe: it runs during the client's hydration-matching render too,
 * not only after mount, so whenever the browser's reported online state
 * differs from the server's implicit "online" assumption, React sees a real
 * structural mismatch, not just a same-content warning (confirmed against a
 * live dev server in Phase 2 — this environment's browser automation
 * reports `navigator.onLine === false`). `useSyncExternalStore` is React's
 * own documented pattern for exactly this case — `navigator.onLine` is used
 * as the canonical example in React's docs.
 */
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
}

export function OfflineBanner() {
  const t = useTranslations("common");
  const isOffline = useIsOffline();

  return (
    <AnimatePresence>
      {isOffline ? (
        <motion.div
          role="status"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-[color:var(--color-warning)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-contrast)]"
        >
          <WifiOff className="size-4" aria-hidden="true" />
          {t("offline")}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

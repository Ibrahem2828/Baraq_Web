"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";

/**
 * A spinner that says what it is doing, in the reader's language.
 *
 * The screen-reader text used to fall back to the string "Loading", so
 * every unlabelled usage -- six of them, including the route-level loading
 * UI and the join page's Suspense boundary -- announced English to an
 * Arabic reader. A spinner with no accessible name is worse than no
 * spinner: it is a status region that says nothing.
 */
export function LoadingState({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations();
  const text = label ?? t("common.loading");

  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-14 text-center", className)}
    >
      <Loader2
        className="size-6 animate-spin text-[color:var(--color-accent-solid)]"
        aria-hidden="true"
      />
      {label ? <p className="text-sm text-[color:var(--color-ink-soft)]">{label}</p> : null}
      <span className="sr-only">{text}</span>
    </div>
  );
}

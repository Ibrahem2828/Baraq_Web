"use client";

import { useSearchParams } from "next/navigation";

/**
 * `?source=<id>` on a character hub: the learner came from a source's page
 * ("use with a character") and the picker opens with it already selected.
 * One start flow for every entry point, with the same request box.
 */
export function usePreselectedSource(): number | null {
  const value = Number(useSearchParams().get("source"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

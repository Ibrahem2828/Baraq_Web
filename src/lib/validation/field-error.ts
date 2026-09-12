import type { FieldError } from "react-hook-form";

/**
 * Resolves a react-hook-form field error to display text. Zod validation
 * errors (`type !== "manual"`) fall back to a generic translated message so
 * we don't have to i18n every Zod error string individually in Phase 1;
 * server-driven errors (`setError(..., {message})`, `type === "manual"`)
 * already carry a translated message and are shown verbatim.
 */
export function fieldErrorMessage(
  error: FieldError | undefined,
  translateFallback: () => string,
): string | undefined {
  if (!error) return undefined;
  if (error.type === "manual" && error.message) return error.message;
  return translateFallback();
}

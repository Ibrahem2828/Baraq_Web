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

const MESSAGE_KEY = /^[a-z][A-Za-z]*(\.[A-Za-z][A-Za-z0-9]*)+$/;

/**
 * Like `fieldErrorMessage`, but a schema message that is an i18n key
 * ("auth.invalidEmail") is translated, so each rule gets its own text.
 * Server-driven (`manual`) messages are shown verbatim.
 */
export function validationMessage(
  error: FieldError | undefined,
  translate: (key: string) => string,
  fallbackKey = "common.requiredField",
): string | undefined {
  if (!error) return undefined;
  if (error.type === "manual" && error.message) return error.message;
  return translate(error.message && MESSAGE_KEY.test(error.message) ? error.message : fallbackKey);
}

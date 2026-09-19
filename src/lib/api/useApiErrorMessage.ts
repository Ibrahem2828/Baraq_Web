"use client";

import { useTranslations } from "next-intl";
import { errorMessageKey } from "./error-messages";
import { ApiError, isApiError } from "./errors";

/**
 * Resolves any thrown value to a user-facing message.
 *
 * Prefers the backend's stable domain code (`file_size_limit_exceeded`,
 * `character_not_allowed`, …) so a predictable, actionable failure tells the
 * user what to do, and falls back to the normalized class before finally
 * reaching "unexpected error". Pages previously hardcoded
 * `t("errors.UNKNOWN")` for every failure, which is how a plan-limit
 * rejection reached the user as "حدث خطأ غير متوقع".
 */
export function useApiErrorMessage() {
  const t = useTranslations();

  return function resolve(error: unknown): string {
    if (!isApiError(error)) return t("errors.UNKNOWN");
    const key = errorMessageKey(error as ApiError);
    // next-intl throws on a missing key; a backend code we have not mapped
    // yet must degrade to the class-level message, never to a crash.
    try {
      return t(key);
    } catch {
      try {
        return t(`errors.${(error as ApiError).code}`);
      } catch {
        return t("errors.UNKNOWN");
      }
    }
  };
}

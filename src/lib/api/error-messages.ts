import type { ApiError } from "./errors";

/**
 * Backend domain code → i18n key under the `errors.domain.*` namespace.
 *
 * The backend puts a stable code at the top level of every error envelope
 * (`apps/common/exceptions.py domain_error_code`). Each predictable,
 * actionable failure gets a message that tells the user what to do; anything
 * unmapped falls back to the class-level message, and only a genuinely
 * unexpected failure reaches "حدث خطأ غير متوقع".
 *
 * Keep this in step with the codes `_raise_limit(...)` raises in
 * `apps/subscriptions/services.py` — the contract test in
 * `tests/unit/error-messages.test.ts` asserts the full set is covered.
 */
export const DOMAIN_ERROR_MESSAGE_KEYS: Record<string, string> = {
  // Subscription / plan limits — every one of these is actionable.
  file_size_limit_exceeded: "errors.domain.file_size_limit_exceeded",
  storage_limit_exceeded: "errors.domain.storage_limit_exceeded",
  source_limit_reached: "errors.domain.source_limit_reached",
  collection_limit_reached: "errors.domain.collection_limit_reached",
  character_limit_reached: "errors.domain.character_limit_reached",
  character_not_allowed: "errors.domain.character_not_allowed",
  ai_request_limit_reached: "errors.domain.ai_request_limit_reached",
  subscription_limit_exceeded: "errors.domain.subscription_limit_exceeded",
  subscription_feature_not_allowed: "errors.domain.subscription_feature_not_allowed",
  // Transport / throttling.
  rate_limited: "errors.domain.rate_limited",
  payload_too_large: "errors.domain.payload_too_large",
};

/**
 * The i18n key for an error, most specific first:
 * backend domain code → normalized class → UNKNOWN.
 */
export function errorMessageKey(error: ApiError): string {
  const domainKey = error.backendCode ? DOMAIN_ERROR_MESSAGE_KEYS[error.backendCode] : undefined;
  return domainKey ?? `errors.${error.code}`;
}

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
  // AI source, retrieval, provider, and output failures.
  pdf_ocr_required: "errors.domain.pdf_ocr_required",
  unsupported_source_format: "errors.domain.unsupported_source_format",
  source_not_found: "errors.domain.source_not_found",
  source_forbidden: "errors.domain.source_forbidden",
  source_download_failed: "errors.domain.source_download_failed",
  source_project_mismatch: "errors.domain.source_project_mismatch",
  source_size_mismatch: "errors.domain.source_size_mismatch",
  source_too_large: "errors.domain.source_too_large",
  source_checksum_mismatch: "errors.domain.source_checksum_mismatch",
  source_version_changed: "errors.domain.source_version_changed",
  source_ingestion_failed: "errors.domain.source_ingestion_failed",
  text_decode_failed: "errors.domain.text_decode_failed",
  pdf_read_failed: "errors.domain.pdf_read_failed",
  docx_read_failed: "errors.domain.docx_read_failed",
  pptx_read_failed: "errors.domain.pptx_read_failed",
  empty_source: "errors.domain.empty_source",
  empty_chunks: "errors.domain.empty_chunks",
  embedding_failed: "errors.domain.embedding_failed",
  embedding_count_mismatch: "errors.domain.embedding_count_mismatch",
  retrieval_failed: "errors.domain.retrieval_failed",
  insufficient_source_context: "errors.domain.insufficient_source_context",
  missing_authoritative_data: "errors.domain.missing_authoritative_data",
  khota_no_study_days: "errors.domain.khota_no_study_days",
  khota_constraint_violation: "errors.domain.khota_constraint_violation",
  audio_source_required: "errors.domain.audio_source_required",
  audio_too_large: "errors.domain.audio_too_large",
  empty_transcription: "errors.domain.empty_transcription",
  transcription_failed: "errors.domain.transcription_failed",
  provider_timeout: "errors.domain.provider_timeout",
  provider_rate_limited: "errors.domain.provider_rate_limited",
  provider_unavailable: "errors.domain.provider_unavailable",
  all_providers_failed: "errors.domain.provider_unavailable",
  no_provider_available: "errors.domain.no_provider_available",
  validation_failed: "errors.domain.result_validation_failed",
  result_validation_failed: "errors.domain.result_validation_failed",
  output_validation_failed: "errors.domain.result_validation_failed",
  worker_interrupted_execution_uncertain: "errors.domain.worker_interrupted",
  // Joining a school. Every one of these is a state the learner can act on
  // -- ask for a new code, ask to be re-invited -- so none of them may
  // degrade to "something went wrong".
  invitation_invalid: "errors.domain.invitation_invalid",
  invitation_revoked: "errors.domain.invitation_revoked",
  invitation_expired: "errors.domain.invitation_expired",
  invitation_exhausted: "errors.domain.invitation_exhausted",
  organization_unavailable: "errors.domain.organization_unavailable",
  class_unavailable: "errors.domain.class_unavailable",
  membership_already_active: "errors.domain.membership_already_active",
};

export function domainErrorMessageKey(code: string | null | undefined): string | undefined {
  return code ? DOMAIN_ERROR_MESSAGE_KEYS[code] : undefined;
}

/**
 * The i18n key for an error, most specific first:
 * backend domain code → normalized class → UNKNOWN.
 */
export function errorMessageKey(error: ApiError): string {
  const domainKey = domainErrorMessageKey(error.backendCode);
  return domainKey ?? `errors.${error.code}`;
}

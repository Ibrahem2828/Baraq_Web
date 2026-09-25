import type { ErrorEnvelope } from "./envelope";

/**
 * Normalized error shape used throughout the app. Ported from the mobile
 * app's `src/services/api/errorNormalizer.ts` `AppError`, with one deliberate
 * change: `code` drives a localized message via the `errors` i18n namespace
 * (`useApiErrorMessage`) instead of a hardcoded Arabic string, since the web
 * app must support both Arabic and English from day one.
 */
export type ApiErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMIT"
  | "SUBSCRIPTION_LIMIT"
  | "SERVER"
  | "UNKNOWN";

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  retryAfterSeconds?: number;
  /** Domain-specific backend code, e.g. `source_limit_reached`. Preserved for upsell UI. */
  backendCode?: string;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    status?: number;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    retryAfterSeconds?: number;
    backendCode?: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors;
    this.requestId = params.requestId;
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.backendCode = params.backendCode;
  }
}

const SUBSCRIPTION_LIMIT_CODES = new Set([
  "source_limit_reached",
  "collection_limit_reached",
  "storage_limit_exceeded",
  "file_size_limit_exceeded",
  "character_limit_reached",
  "character_not_allowed",
  "ai_request_limit_reached",
]);

function codeFromStatus(status: number | undefined, backendCode: string | undefined): ApiErrorCode {
  if (backendCode && SUBSCRIPTION_LIMIT_CODES.has(backendCode)) return "SUBSCRIPTION_LIMIT";
  switch (status) {
    case 400:
    case 422:
      return "VALIDATION";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 429:
      return "RATE_LIMIT";
    default:
      if (status && status >= 500) return "SERVER";
      return "UNKNOWN";
  }
}

function extractFieldErrors(errors: ErrorEnvelope["errors"]): Record<string, string[]> | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (key === "detail") continue;
    if (Array.isArray(value)) {
      result[key] = value.map(String);
    } else if (typeof value === "string") {
      result[key] = [value];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Builds an `ApiError` from a parsed backend error envelope + response metadata. */
export function fromErrorEnvelope(
  envelope: ErrorEnvelope | null,
  status: number,
  headers: Headers,
): ApiError {
  const backendCode = envelope?.code;
  const requestId = envelope?.request_id ?? headers.get("x-request-id") ?? undefined;
  const retryAfterHeader = headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;

  return new ApiError({
    code: codeFromStatus(status, backendCode),
    message: envelope?.message ?? "Request failed",
    status,
    fieldErrors: extractFieldErrors(envelope?.errors),
    requestId: requestId ?? undefined,
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    backendCode,
  });
}

export function fromNetworkError(error: unknown): ApiError {
  // AbortSignal.timeout() rejects with a "TimeoutError", not an "AbortError";
  // it used to fall through to NETWORK, so a slow request was reported to the
  // student as "Couldn't reach the server".
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new ApiError({ code: "TIMEOUT", message: "Request timed out" });
  }
  return new ApiError({
    code: "NETWORK",
    message: error instanceof Error ? error.message : "Network request failed",
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

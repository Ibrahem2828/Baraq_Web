import { describe, expect, it } from "vitest";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import { DOMAIN_ERROR_MESSAGE_KEYS, errorMessageKey } from "@/lib/api/error-messages";
import { ApiError, fromErrorEnvelope } from "@/lib/api/errors";

/**
 * Error-contract guard.
 *
 * The backend puts a stable domain code at the top level of every error
 * envelope. A predictable, actionable failure must reach the user as a
 * specific message — not "حدث خطأ غير متوقع", which is what every plan-limit
 * rejection used to produce.
 */

/** Every code `_raise_limit(...)` can raise in apps/subscriptions/services.py. */
const BACKEND_SUBSCRIPTION_CODES = [
  "file_size_limit_exceeded",
  "storage_limit_exceeded",
  "source_limit_reached",
  "collection_limit_reached",
  "character_limit_reached",
  "character_not_allowed",
  "ai_request_limit_reached",
  "subscription_limit_exceeded",
  "subscription_feature_not_allowed",
];

function lookup(messages: unknown, dottedKey: string): unknown {
  return dottedKey
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );
}

describe("domain error message mapping", () => {
  it.each(BACKEND_SUBSCRIPTION_CODES)("maps %s to a dedicated message", (code) => {
    expect(DOMAIN_ERROR_MESSAGE_KEYS[code]).toBeDefined();
  });

  it.each(Object.entries(DOMAIN_ERROR_MESSAGE_KEYS))(
    "%s resolves to real copy in both locales",
    (_code, key) => {
      for (const [locale, messages] of [
        ["ar", arMessages],
        ["en", enMessages],
      ] as const) {
        const value = lookup(messages, key);
        expect(typeof value, `${key} missing in ${locale}`).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    },
  );

  it("prefers the backend domain code over the status-derived class", () => {
    // A 403 whose real meaning is "your plan is too small". Resolving by
    // status alone would render the generic FORBIDDEN copy.
    const error = new ApiError({
      code: "SUBSCRIPTION_LIMIT",
      message: "…",
      status: 403,
      backendCode: "file_size_limit_exceeded",
    });
    expect(errorMessageKey(error)).toBe("errors.domain.file_size_limit_exceeded");
  });

  it("falls back to the class when the backend code is unmapped", () => {
    const error = new ApiError({
      code: "SERVER",
      message: "…",
      status: 500,
      backendCode: "some_future_code",
    });
    expect(errorMessageKey(error)).toBe("errors.SERVER");
  });

  it("reads the domain code from the envelope's top level", () => {
    // The end-to-end regression: the handler used to put `permission_denied`
    // here and bury the real code under `errors`, so this mapping was dead.
    const error = fromErrorEnvelope(
      {
        success: false,
        message: "حجم الملف أكبر من الحد المسموح (50MB).",
        code: "file_size_limit_exceeded",
        errors: { code: "file_size_limit_exceeded", limit: 50 },
      } as never,
      403,
      new Headers(),
    );

    expect(error.backendCode).toBe("file_size_limit_exceeded");
    expect(error.code).toBe("SUBSCRIPTION_LIMIT");
    expect(errorMessageKey(error)).toBe("errors.domain.file_size_limit_exceeded");
  });

  it("still classifies a generic permission denial as FORBIDDEN", () => {
    const error = fromErrorEnvelope(
      { success: false, message: "…", code: "permission_denied", errors: {} } as never,
      403,
      new Headers(),
    );
    expect(error.code).toBe("FORBIDDEN");
    expect(errorMessageKey(error)).toBe("errors.FORBIDDEN");
  });
});

import { describe, expect, it } from "vitest";
import { fromErrorEnvelope, fromNetworkError, ApiError } from "@/lib/api/errors";

describe("fromErrorEnvelope", () => {
  it("maps a 400 validation envelope to a VALIDATION ApiError with field errors", () => {
    const error = fromErrorEnvelope(
      {
        success: false,
        message: "Validation error",
        code: "validation_error",
        errors: { email: ["This field is required."] },
        request_id: "req-1",
      },
      400,
      new Headers(),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("VALIDATION");
    expect(error.fieldErrors).toEqual({ email: ["This field is required."] });
    expect(error.requestId).toBe("req-1");
  });

  it("maps a 401 to UNAUTHORIZED", () => {
    const error = fromErrorEnvelope(
      { success: false, message: "Auth required", code: "authentication_error" },
      401,
      new Headers(),
    );
    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("maps a subscription-limit backend code to SUBSCRIPTION_LIMIT regardless of status", () => {
    const error = fromErrorEnvelope(
      { success: false, message: "Limit reached", code: "source_limit_reached" },
      400,
      new Headers(),
    );
    expect(error.code).toBe("SUBSCRIPTION_LIMIT");
    expect(error.backendCode).toBe("source_limit_reached");
  });

  it("reads request id from the response header when the envelope omits it", () => {
    const headers = new Headers({ "x-request-id": "header-req-id" });
    const error = fromErrorEnvelope({ success: false, message: "Server error" }, 500, headers);
    expect(error.code).toBe("SERVER");
    expect(error.requestId).toBe("header-req-id");
  });

  it("parses retry-after header into retryAfterSeconds", () => {
    const headers = new Headers({ "retry-after": "30" });
    const error = fromErrorEnvelope({ success: false, message: "Too many requests" }, 429, headers);
    expect(error.code).toBe("RATE_LIMIT");
    expect(error.retryAfterSeconds).toBe(30);
  });

  it("excludes the detail field from fieldErrors", () => {
    const error = fromErrorEnvelope(
      { success: false, message: "Not found", errors: { detail: "Not found." } },
      404,
      new Headers(),
    );
    expect(error.fieldErrors).toBeUndefined();
  });
});

describe("fromNetworkError", () => {
  it("maps an AbortError to TIMEOUT", () => {
    const error = fromNetworkError(new DOMException("Aborted", "AbortError"));
    expect(error.code).toBe("TIMEOUT");
  });

  it("maps AbortSignal.timeout()'s TimeoutError to TIMEOUT, not NETWORK", () => {
    // It used to fall through to NETWORK: a slow request told the student
    // "Couldn't reach the server".
    const error = fromNetworkError(new DOMException("signal timed out", "TimeoutError"));
    expect(error.code).toBe("TIMEOUT");
  });

  it("maps any other error to NETWORK", () => {
    const error = fromNetworkError(new Error("fetch failed"));
    expect(error.code).toBe("NETWORK");
  });
});

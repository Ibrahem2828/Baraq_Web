import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  processSource,
  type SourceProcessingQueuedResponse,
} from "@/features/sources/api/sourcesApi";
import { CSRF_COOKIE } from "@/lib/auth/cookie-names";

/**
 * Contract guard for `POST /student-sources/{id}/process/`.
 *
 * The backend answers **202** with `{message, source}` — see
 * `SourceProcessingQueuedResponseSerializer` in `apps/sources/serializers.py`
 * and `SourceProcessingQueuedResponse` in `contracts/openapi.json`. This app
 * previously typed the call as a bare `StudentSource`, which type-checked
 * cleanly while every field read `undefined` at runtime. Both the shape and
 * the type are asserted here so neither can regress silently.
 */

/** The exact bytes Django puts on the wire: EnvelopeJSONRenderer around the 202 body. */
const DJANGO_202_BODY = {
  success: true,
  message: "Success",
  data: {
    message: "تمت إضافة المصدر إلى طابور المعالجة.",
    source: { id: 42, title: "Math Summary", status: "uploaded" },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("processSource contract", () => {
  it("resolves the queued envelope, not a bare source", async () => {
    document.cookie = `${CSRF_COOKIE}=test-csrf-token`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(DJANGO_202_BODY), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await processSource(42);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bff/student-sources/42/process");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });

    expect(Object.keys(result).sort()).toEqual(["message", "source"]);
    expect(result.message).toBe("تمت إضافة المصدر إلى طابور المعالجة.");
    expect(result.source.id).toBe(42);
    // The regression this guards: reading an id straight off the response.
    expect((result as unknown as { id?: number }).id).toBeUndefined();
  });

  it("is typed as the envelope so a bare-source read cannot compile", () => {
    expectTypeOf(processSource).returns.resolves.toEqualTypeOf<SourceProcessingQueuedResponse>();
    expectTypeOf<SourceProcessingQueuedResponse>().toHaveProperty("message");
    expectTypeOf<SourceProcessingQueuedResponse>().toHaveProperty("source");
  });
});

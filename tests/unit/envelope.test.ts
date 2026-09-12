import { describe, expect, it } from "vitest";
import { unwrapPaginated, isPaginationMeta, type SuccessEnvelope } from "@/lib/api/envelope";

describe("unwrapPaginated", () => {
  it("flattens a DRF-style paginated envelope", () => {
    const envelope: SuccessEnvelope<{ id: number }[]> = {
      success: true,
      message: "Success",
      data: [{ id: 1 }, { id: 2 }],
      meta: { count: 42, next: "https://api.example.com/?page=2", previous: null },
    };

    const result = unwrapPaginated(envelope);
    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      count: 42,
      next: "https://api.example.com/?page=2",
      previous: null,
    });
  });

  it("falls back to array length when meta is absent (unpaginated endpoints)", () => {
    const envelope: SuccessEnvelope<{ id: number }[]> = {
      success: true,
      message: "Success",
      data: [{ id: 1 }],
    };

    const result = unwrapPaginated(envelope);
    expect(result).toEqual({ items: [{ id: 1 }], count: 1, next: null, previous: null });
  });
});

describe("isPaginationMeta", () => {
  it("returns true only for objects with count/next/previous", () => {
    expect(isPaginationMeta({ count: 1, next: null, previous: null })).toBe(true);
    expect(isPaginationMeta({ foo: "bar" })).toBe(false);
    expect(isPaginationMeta(null)).toBe(false);
  });
});

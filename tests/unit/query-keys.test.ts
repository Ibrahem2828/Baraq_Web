import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";

/**
 * Regression coverage for a real Phase 2.5 bug: a mutation's `onSuccess`
 * writes the cache using a numeric `id` straight off the JSON response,
 * while the page reading that same entity subscribes using the route
 * param — always a string. Before the `idKey()` normalization in
 * `lib/query/keys.ts`, `detail(1)` and `detail("1")` produced different
 * array keys (React Query compares by deep equality), so the mutation's
 * cache write silently missed the query the page actually held — the
 * recommendation "mark as read" button never disappeared after a real,
 * successful mutation. Every detail-style key factory must produce an
 * identical key regardless of whether it's called with a number or a
 * string.
 */
describe("queryKeys id normalization", () => {
  it("produces identical keys for a numeric id and its string form", () => {
    expect(queryKeys.results.recommendation(1)).toEqual(queryKeys.results.recommendation("1"));
    expect(queryKeys.studyPlans.detail(42)).toEqual(queryKeys.studyPlans.detail("42"));
    expect(queryKeys.quizzes.detail(7)).toEqual(queryKeys.quizzes.detail("7"));
    expect(queryKeys.sources.detail(3)).toEqual(queryKeys.sources.detail("3"));
    expect(queryKeys.support.ticket(9)).toEqual(queryKeys.support.ticket("9"));
  });

  it("keeps distinct ids apart", () => {
    expect(queryKeys.results.recommendation(1)).not.toEqual(queryKeys.results.recommendation(2));
  });
});

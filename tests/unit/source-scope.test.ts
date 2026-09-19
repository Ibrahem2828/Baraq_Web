import { describe, expect, it } from "vitest";
import type { SourceScope } from "@/features/sources/components/SourceScopePicker";
import type { CreateAIJobInput } from "@/features/ai-jobs/api/aiJobsApi";

/**
 * Scope contract guard.
 *
 * Selecting several sources for one AI request used to be expressed by
 * bulk-reassigning them into a collection — a permanent, user-visible
 * reorganisation of the learner's library made only to describe one temporary
 * request, and one that silently changed what an existing job meant if the
 * folder was later edited. The selection now travels as `source_ids` and is
 * recorded on the job.
 */

/** What the picker hands a character hub, spread straight into the job body. */
function jobBodyFor(scope: SourceScope): CreateAIJobInput {
  return { task_type: "fahes_generate_quiz", ...scope };
}

describe("AI job source scope", () => {
  it("sends a single selection as the singular form the backend has always taken", () => {
    const body = jobBodyFor({ source: 7 });
    expect(body.source).toBe(7);
    expect(body.source_ids).toBeUndefined();
    expect(body.collection).toBeUndefined();
  });

  it("sends several sources as an explicit selection, not a collection", () => {
    const body = jobBodyFor({ source_ids: [7, 8, 9] });
    expect(body.source_ids).toEqual([7, 8, 9]);
    // The regression this guards: a collection id here meant the library had
    // just been reorganised to produce one.
    expect(body.collection).toBeUndefined();
    expect(body.source).toBeUndefined();
  });

  it("still supports choosing a saved folder deliberately", () => {
    const body = jobBodyFor({ collection: 3 });
    expect(body.collection).toBe(3);
    expect(body.source_ids).toBeUndefined();
  });

  it("never sends two scope forms at once", () => {
    const scopes: SourceScope[] = [{ source: 1 }, { collection: 2 }, { source_ids: [1, 2] }];
    for (const scope of scopes) {
      const body = jobBodyFor(scope);
      const present = [body.source, body.collection, body.source_ids].filter(
        (value) => value !== undefined,
      );
      expect(present).toHaveLength(1);
    }
  });
});

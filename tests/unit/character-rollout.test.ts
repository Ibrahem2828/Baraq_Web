import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Character rollout must be opt-in.
 *
 * These flags gate characters whose end-to-end behaviour has not been
 * accepted against a real AI stack. The transform used to be
 * `value !== "false"`, which meant an *unset* variable read as enabled — so a
 * deployment that simply never set the variable shipped an unverified
 * character to learners, and nothing in the config looked wrong.
 *
 * The distinction is one operator, so it is worth a test of its own rather
 * than only asserting the resolved `isLive` values.
 */

/** Mirrors the transform in src/config/env.public.ts. */
const gate = z
  .string()
  .optional()
  .transform((value) => value === "true");

const schema = z.object({
  NEXT_PUBLIC_FEATURE_KHOLASA: gate,
  NEXT_PUBLIC_FEATURE_SADA: gate,
});

function resolve(env: Record<string, string | undefined>) {
  return schema.parse(env);
}

describe("gated character rollout", () => {
  it("is disabled when the variable is not set at all", () => {
    const flags = resolve({});
    expect(flags.NEXT_PUBLIC_FEATURE_KHOLASA).toBe(false);
    expect(flags.NEXT_PUBLIC_FEATURE_SADA).toBe(false);
  });

  it("is disabled for an empty value", () => {
    const flags = resolve({
      NEXT_PUBLIC_FEATURE_KHOLASA: "",
      NEXT_PUBLIC_FEATURE_SADA: "",
    });
    expect(flags.NEXT_PUBLIC_FEATURE_KHOLASA).toBe(false);
    expect(flags.NEXT_PUBLIC_FEATURE_SADA).toBe(false);
  });

  it.each(["1", "yes", "on", "TRUE", "True", "enabled", "false"])(
    "is disabled for the ambiguous value %s",
    (value) => {
      // Only the exact string "true" enables. Anything else — including a
      // well-meant "1" or "yes" — leaves the character gated, because a
      // half-recognised value must not be read as consent to ship.
      const flags = resolve({ NEXT_PUBLIC_FEATURE_KHOLASA: value });
      expect(flags.NEXT_PUBLIC_FEATURE_KHOLASA).toBe(false);
    },
  );

  it("is enabled only by an explicit true", () => {
    const flags = resolve({
      NEXT_PUBLIC_FEATURE_KHOLASA: "true",
      NEXT_PUBLIC_FEATURE_SADA: "true",
    });
    expect(flags.NEXT_PUBLIC_FEATURE_KHOLASA).toBe(true);
    expect(flags.NEXT_PUBLIC_FEATURE_SADA).toBe(true);
  });

  it("rejects the old opt-out semantics", () => {
    // The regression, stated directly: under `value !== "false"` an unset
    // variable resolved to true.
    const optOut = (value: string | undefined) => value !== "false";
    expect(optOut(undefined)).toBe(true);
    expect(resolve({}).NEXT_PUBLIC_FEATURE_KHOLASA).toBe(false);
  });
});

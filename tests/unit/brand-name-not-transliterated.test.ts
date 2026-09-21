import { describe, expect, it } from "vitest";
import enMessages from "@/messages/en.json";

/**
 * Regression guard: the brand name must never be transliterated to Latin
 * script, even in English-locale copy. Found live in this pass: six English
 * strings spelled the brand as "Baraq" (appName, two login/register
 * subtitles, the characters hub title, and two "About Baraq" settings
 * labels) while every one of their Arabic counterparts already correctly
 * used "برّاق" -- the product name is برّاق regardless of interface
 * locale, the same way it stays untranslated in the browser tab title
 * (see src/config/env.ts's NEXT_PUBLIC_APP_NAME, which this test does not
 * cover since it isn't part of messages/en.json).
 *
 * Scans every leaf string in the English message tree rather than pinning
 * the six locations found this time, so a *new* English string introduced
 * later that spells out "Baraq" fails here immediately instead of shipping
 * quietly.
 */

type Tree = { [key: string]: string | Tree };

function leaves(node: Tree, prefix = ""): Array<{ path: string; value: string }> {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [{ path, value }]
      : leaves(value as Tree, path);
  });
}

// Word-boundary match: must not fire on an unrelated word that merely
// contains the substring, and must not fire on "برّاق" itself (different
// script, so a plain substring check already can't confuse the two).
const LATIN_BRAND_NAME = /\bBaraq\b/;

describe("the brand name برّاق is never spelled out in Latin script", () => {
  it("no English string says \"Baraq\" instead of \"برّاق\"", () => {
    const offenders = leaves(enMessages as Tree)
      .filter(({ value }) => LATIN_BRAND_NAME.test(value))
      .map(({ path, value }) => `${path}: ${JSON.stringify(value)}`);

    expect(offenders).toEqual([]);
  });
});

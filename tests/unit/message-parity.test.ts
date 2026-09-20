import { describe, expect, it } from "vitest";

import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";

/**
 * next-intl throws when a key is missing, so a key present in one locale
 * and absent from the other is not a cosmetic gap -- it is a crash for
 * whoever is reading in that language. The topbar alone appears on every
 * authenticated page.
 *
 * Arabic is the reference: this product is Arabic-first, and an English
 * string quietly falling back to Arabic is a smaller failure than an
 * Arabic reader hitting an English label or a blank.
 */
type Tree = { [key: string]: string | Tree };

function leafPaths(node: Tree, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafPaths(value as Tree, path);
  });
}

function valueAt(node: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (current, part) =>
      current && typeof current === "object" ? (current as Tree)[part] : undefined,
    node,
  );
}

const ar = leafPaths(arMessages as unknown as Tree);
const en = leafPaths(enMessages as unknown as Tree);

describe("translation parity", () => {
  it("has the same keys in both locales", () => {
    const arSet = new Set(ar);
    const enSet = new Set(en);

    expect({
      missingInEnglish: ar.filter((k) => !enSet.has(k)),
      missingInArabic: en.filter((k) => !arSet.has(k)),
    }).toEqual({ missingInEnglish: [], missingInArabic: [] });
  });

  it("has no empty strings", () => {
    const empty = [...ar, ...en].filter((path) => {
      const inAr = valueAt(arMessages as unknown as Tree, path);
      const inEn = valueAt(enMessages as unknown as Tree, path);
      return inAr === "" || inEn === "";
    });

    expect(empty).toEqual([]);
  });

  it("translates the theme names rather than leaving them in English", () => {
    // The specific gap this test was written for: the theme picker's
    // labels were hardcoded English in an Arabic-first app, and they are
    // the toggle's accessible name as well as its menu items.
    for (const name of ["system", "light", "dark", "fire"]) {
      const arabic = valueAt(arMessages as unknown as Tree, `settings.themeNames.${name}`);
      const english = valueAt(enMessages as unknown as Tree, `settings.themeNames.${name}`);

      expect(typeof arabic).toBe("string");
      expect(typeof english).toBe("string");
      // If the Arabic still equals the English, nobody translated it.
      expect(arabic).not.toBe(english);
      expect(arabic).toMatch(/\p{Script=Arabic}/u);
    }
  });
});

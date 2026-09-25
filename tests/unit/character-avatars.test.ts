// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The five characters looked like different sizes in identical frames: the
 * full artwork (1254px, 1.4-2MB each) had different empty margins per
 * character, and object-contain fits the canvas, not the figure. The avatar
 * files are normalised instead -- one 512px canvas, same figure height and
 * baseline (scripts in the commit that added them) -- and light enough for
 * slow connections.
 */
const root = path.resolve(__dirname, "../../src/assets/characters");
const KEYS = ["khota", "fahes", "rasheed", "kholasa", "sada"] as const;

function webpSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  expect(bytes.toString("ascii", 12, 16)).toBe("VP8X"); // extended format: has alpha
  const width = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
  const height = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
  return { width, height };
}

describe("character avatars", () => {
  it.each(KEYS)("%s has a normalised 512px transparent avatar under 100KB", (key) => {
    const file = path.join(root, key, `character_${key}_avatar.webp`);
    expect(webpSize(file)).toEqual({ width: 512, height: 512 });
    expect(statSync(file).size).toBeLessThan(100 * 1024);
  });

  it("CharacterAvatar renders the normalised avatar for every character", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../src/components/brand/CharacterAvatar.tsx"),
      "utf8",
    );
    expect(source).toContain("assets.characters[character.key].avatar");
    const assets = readFileSync(path.resolve(__dirname, "../../src/assets/assets.ts"), "utf8");
    for (const key of KEYS) expect(assets).toContain(`avatar: ${key}Avatar`);
  });
});

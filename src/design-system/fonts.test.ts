import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("font loading", () => {
  it("does not make the production build download third-party fonts", () => {
    const source = readFileSync(path.join(process.cwd(), "src/design-system/fonts.ts"), "utf8");

    expect(source).not.toContain('next/font/google');
  });
});

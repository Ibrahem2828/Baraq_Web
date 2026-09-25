import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validationMessage } from "@/lib/validation/field-error";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

describe("logical position classes", () => {
  it("uses Tailwind v4 names: `inset-inline-*` compiles to nothing", () => {
    // Drawer, Modal and Select close/chevron buttons, the password toggle and
    // the toast region were positioned by classes Tailwind never generated.
    const offenders = sourceFiles(path.join(process.cwd(), "src")).filter((file) =>
      /\binset-inline-(start|end)-/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe("validationMessage", () => {
  const translate = (key: string) => `t:${key}`;

  it("translates a schema message that is an i18n key", () => {
    expect(validationMessage({ type: "invalid_string", message: "auth.invalidEmail" }, translate)).toBe(
      "t:auth.invalidEmail",
    );
  });

  it("falls back for a raw Zod message and shows server messages verbatim", () => {
    expect(validationMessage({ type: "too_small", message: "String must contain at least 1 character(s)" }, translate)).toBe(
      "t:common.requiredField",
    );
    expect(validationMessage({ type: "manual", message: "هذا البريد مسجّل مسبقًا" }, translate)).toBe(
      "هذا البريد مسجّل مسبقًا",
    );
  });
});

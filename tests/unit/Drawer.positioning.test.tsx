import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { Drawer } from "@/components/ui/Drawer";

// jsdom never computes Tailwind layout, so the only guard against the mobile
// menu rendering off-screen again is pinning the class contract directly.
// `inset-block-0` and `data-[state=open]:animate-drawer-start` are not
// Tailwind utilities: they compile to no CSS at all, silently, which left the
// panel positioned ~1200px below the viewport with no slide-in animation.
describe("Drawer positioning contract", () => {
  it.each(["start", "end"] as const)("pins the %s panel to the viewport with real utilities", (side) => {
    render(
      <Drawer open onOpenChange={() => {}} title="Menu" side={side}>
        <span>content</span>
      </Drawer>,
    );
    const classes = screen.getByRole("dialog").className.split(/\s+/);

    expect(classes).toEqual(expect.arrayContaining(["fixed", "inset-y-0", `inset-inline-${side}-0`, `animate-drawer-${side}`]));
    expect(classes).not.toContain("inset-block-0");
    expect(classes.some((name) => name.startsWith("data-[state=open]:animate-drawer"))).toBe(false);
  });

  it("defines the open and close animations the plain classes rely on, for both directions", () => {
    const css = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
    for (const side of ["start", "end"]) {
      for (const state of ["open", "closed"]) {
        for (const dir of ["ltr", "rtl"]) {
          expect(css).toContain(`:dir(${dir}) .animate-drawer-${side}[data-state="${state}"]`);
        }
      }
    }
  });
});

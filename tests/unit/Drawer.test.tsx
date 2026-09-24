import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { Drawer } from "@/components/ui/Drawer";

function DrawerHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="Main navigation" side="start">
        <Link href="/dashboard">Dashboard</Link>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("opens from its trigger and closes with the accessible close control", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "common.close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

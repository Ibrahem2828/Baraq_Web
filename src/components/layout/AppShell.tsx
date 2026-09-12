import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { OfflineBanner } from "@/components/feedback/OfflineBanner";

/**
 * Responsive application shell: a fixed sidebar + topbar on desktop
 * (`lg:` and up), a topbar + bottom tab bar on tablet/mobile. No layout
 * shift between breakpoints — both nav surfaces are always in the DOM and
 * toggled purely with CSS (`hidden lg:flex` / `lg:hidden`), never
 * client-side JS measuring viewport width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <OfflineBanner />
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <Topbar />
        {/*
          `main` must be a plain, unconstrained flex item so it stretches to
          the full width its sidebar-adjacent flex parent offers. The old
          code put `.container-page` (max-width + `margin-inline: auto`)
          directly on `main` itself — but auto margins on a flex item's
          cross axis absorb the stretch space instead of letting it grow,
          so `main` silently shrank to whatever width its own content
          naturally wanted (found live in Phase 3 QA: a short single-card
          page like Today rendered at ~465px in a ~1180px-capable column,
          while Home merely happened to have wide-enough content to mask
          the same bug). Splitting stretch (on `main`) from max-width+center
          (on this inner, non-flex-item div) fixes every page at once.
        */}
        <main className="flex-1 py-8 pb-24 lg:pb-8">
          <div className="container-page">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

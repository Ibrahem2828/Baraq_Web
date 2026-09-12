import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { assets } from "@/assets/assets";

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[color:var(--color-bg-soft)]">
      {/* The one real illustration asset verified distinct and on-brand for
       * a decorative full-bleed background (see docs/ASSET_INVENTORY.md —
       * most other "empty state" images turned out to be duplicates of a
       * single unrelated character, not usable this way). */}
      <Image
        src={assets.backgrounds.homeSoftGems}
        alt=""
        fill
        priority
        className="pointer-events-none absolute inset-0 object-cover opacity-15"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <LocaleSwitcher />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

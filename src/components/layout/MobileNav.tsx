"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PRIMARY_NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils/cn";

/** Bottom tab bar, visible below the `lg` breakpoint — preserves the mobile app's native-app feel on small screens. */
export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {PRIMARY_NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              isActive ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-ink-faint)]",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

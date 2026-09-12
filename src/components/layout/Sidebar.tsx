"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "./nav-items";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 px-2">
        <Logo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                isActive
                  ? "bg-[color:var(--color-accent-solid)]/12 text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg-soft)] hover:text-[color:var(--color-ink)]",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

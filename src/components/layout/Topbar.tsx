"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, Bell, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useCurrentUser, useLogout } from "@/lib/auth/client";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useNotifications";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { Drawer } from "@/components/ui/Drawer";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NAV_ITEMS } from "./nav-items";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils/cn";

export function Topbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { data: unreadCount } = useUnreadNotificationCount();
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/80 sm:px-6">
      <IconButton
        aria-label={t("common.menu")}
        size="sm"
        className="lg:hidden"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </IconButton>

      <div className="flex-1 lg:hidden">
        <Logo />
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <LocaleSwitcher />
        <ThemeToggle
          labels={{
            system: t("settings.themeNames.system"),
            light: t("settings.themeNames.light"),
            dark: t("settings.themeNames.dark"),
            fire: t("settings.themeNames.fire"),
          }}
        />
        <Link href="/notifications" className="relative">
          <IconButton aria-label={t("nav.notifications")} size="sm">
            <Bell className="size-4" aria-hidden="true" />
          </IconButton>
          {unreadCount ? (
            <Badge
              variant="destructive"
              className="absolute -end-1 -top-1 min-w-4 justify-center px-1 py-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Link>

        <Dropdown
          align="end"
          trigger={
            <button type="button" aria-label={t("nav.profile")} className="rounded-full">
              <Avatar
                alt={user?.full_name ?? ""}
                fallback={(user?.full_name ?? "?").charAt(0)}
                size="sm"
              />
            </button>
          }
          onSelect={(value) => {
            if (value === "logout") logout.mutate();
          }}
          items={[
            {
              value: "settings",
              label: t("nav.settings"),
              icon: <SettingsIcon className="size-4" />,
            },
            {
              value: "logout",
              label: t("nav.logout"),
              icon: <LogOut className="size-4" />,
              destructive: true,
            },
          ]}
        />
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={t("common.appName")}
        side="start"
      >
        <div className="mb-6">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-[color:var(--color-accent-solid)]/12 text-[color:var(--color-accent)]"
                    : "text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg-soft)]",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {t(item.labelKey)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="mt-2 flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[color:var(--color-destructive)] hover:bg-[color:var(--color-destructive-bg)]"
          >
            <LogOut className="size-5" aria-hidden="true" />
            {t("nav.logout")}
          </button>
        </nav>
      </Drawer>
    </header>
  );
}

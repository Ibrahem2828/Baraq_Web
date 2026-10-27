"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, Bell, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { data: unreadCount } = useUnreadNotificationCount();
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const themeLabels = {
    system: t("settings.themeNames.system"),
    light: t("settings.themeNames.light"),
    dark: t("settings.themeNames.dark"),
    fire: t("settings.themeNames.fire"),
  };

  // Sticky, except on a phone held sideways (under 480px tall): there the
  // bar and the bottom tabs together took a third of the screen.
  return (
    <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] items-center gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/80 sm:px-6 [@media(max-height:480px)]:static">
      <IconButton
        aria-label={t("common.menu")}
        size="sm"
        className="lg:hidden"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </IconButton>

      <div className="min-w-0 flex-1 lg:hidden">
        <Logo />
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        {/* Six 44px controls do not fit a 320px phone: below `sm` these two
            move into the menu drawer. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <LocaleSwitcher />
          <ThemeToggle labels={themeLabels} />
        </div>
        {/* One focusable control, not a link wrapping a button. */}
        <IconButton aria-label={t("nav.notifications")} size="sm" className="relative" asChild>
          <Link href="/notifications">
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount ? (
              <Badge
                variant="destructive"
                className="absolute -end-1 -top-1 min-w-4 justify-center px-1 py-0 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            ) : null}
          </Link>
        </IconButton>

        <Dropdown
          align="end"
          trigger={
            <button
              type="button"
              aria-label={t("nav.profile")}
              className="flex items-center justify-center rounded-full pointer-coarse:size-11"
            >
              <Avatar
                alt={user?.full_name ?? ""}
                fallback={(user?.full_name ?? "?").charAt(0)}
                size="sm"
              />
            </button>
          }
          onSelect={(value) => {
            if (value === "settings") router.push("/settings");
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
        <div className="mb-6 flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-1.5 sm:hidden">
            <LocaleSwitcher />
            <ThemeToggle labels={themeLabels} />
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label={t("common.a11y.mainNav")}>
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
                  "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium",
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
            className="mt-2 flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[color:var(--color-destructive)] hover:bg-[color:var(--color-destructive-bg)]"
          >
            <LogOut className="size-5" aria-hidden="true" />
            {t("nav.logout")}
          </button>
        </nav>
      </Drawer>
    </header>
  );
}

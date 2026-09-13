"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronRight,
  User as UserIcon,
  BookOpen,
  KeyRound,
  Info,
  ShieldCheck,
  FileText,
  LogOut,
  Trash2,
  Sun,
  Moon,
  Flame,
  MonitorSmartphone,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLogout } from "@/lib/auth/client";
import { useDeleteAccount } from "@/features/auth/hooks/useAuthMutations";
import { useThemeStore, type ThemePreference } from "@/stores/theme-store";
import { featureFlags } from "@/config/feature-flags";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils/cn";

function SettingsRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-4 text-sm text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-bg-soft)]"
    >
      <Icon className="size-5 shrink-0 text-[color:var(--color-ink-faint)]" aria-hidden="true" />
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight
        className="size-4 shrink-0 text-[color:var(--color-ink-faint)] [&:dir(rtl)]:-scale-x-100"
        aria-hidden="true"
      />
    </Link>
  );
}

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  system: MonitorSmartphone,
  light: Sun,
  dark: Moon,
  fire: Flame,
};

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // No per-option i18n keys exist for theme names yet (mirrors the same gap in
  // components/layout/ThemeToggle.tsx's Topbar usage) — hardcoded pending a
  // `settings.themeOptions.*` message addition.
  const themeLabels: Record<ThemePreference, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
    fire: "Fire",
  };

  return (
    <FadeIn>
      <PageHeader title={t("settings.title")} />

      <div className="flex flex-col gap-8">
        <section>
          <SectionHeader title={t("settings.sections.account")} />
          <Card className="divide-y divide-[color:var(--color-border)] p-0">
            <SettingsRow
              href="/settings/profile"
              icon={UserIcon}
              label={t("settings.profile.title")}
            />
            <SettingsRow
              href="/settings/subjects"
              icon={BookOpen}
              label={t("settings.subjects.title")}
            />
            <SettingsRow
              href="/settings/change-password"
              icon={KeyRound}
              label={t("settings.changePassword.title")}
            />
          </Card>
        </section>

        <section>
          <SectionHeader title={t("settings.sections.preferences")} />
          <Card>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-[color:var(--color-ink)]">
                {t("settings.theme")}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.keys(THEME_ICONS) as ThemePreference[]).map((key) => {
                  const Icon = THEME_ICONS[key];
                  const selected = preference === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreference(key)}
                      aria-pressed={selected}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border px-3 py-4 text-xs font-medium transition-colors",
                        selected
                          ? "border-[color:var(--color-accent-solid)] bg-[color:var(--color-accent-solid)]/10 text-[color:var(--color-accent)]"
                          : "border-[color:var(--color-border)] text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg-soft)]",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {themeLabels[key]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4">
              <p className="text-sm font-medium text-[color:var(--color-ink)]">
                {t("settings.language")}
              </p>
              <LocaleSwitcher />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title={t("settings.sections.legal")} />
          <Card className="divide-y divide-[color:var(--color-border)] p-0">
            <SettingsRow href="/settings/about" icon={Info} label={t("settings.about")} />
            <SettingsRow
              href="/settings/privacy"
              icon={ShieldCheck}
              label={t("settings.privacyPolicy")}
            />
            <SettingsRow
              href="/settings/terms"
              icon={FileText}
              label={t("settings.termsOfService")}
            />
          </Card>
        </section>

        <section>
          <Card className="p-0">
            <button
              type="button"
              disabled={!featureFlags.accountDeletion}
              onClick={() => setDeleteOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-[color:var(--color-bg-soft)]",
                !featureFlags.accountDeletion && "cursor-not-allowed opacity-60",
              )}
            >
              <Trash2
                className="size-5 shrink-0 text-[color:var(--color-destructive)]"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[color:var(--color-ink)]">
                  {t("settings.accountDeletion.title")}
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--color-ink-soft)]">
                  {t("settings.accountDeletion.description")}
                </p>
              </div>
            </button>
          </Card>
        </section>

        <section>
          <Button
            variant="destructive"
            onClick={() => setLogoutOpen(true)}
            className="w-full sm:w-auto"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t("settings.logout")}
          </Button>
        </section>
      </div>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("settings.accountDeletion.title")}
        description={
          deleteAccount.error instanceof Error
            ? deleteAccount.error.message
            : t("settings.accountDeletion.confirmation")
        }
        confirmLabel={t("settings.accountDeletion.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={deleteAccount.isPending}
        onConfirm={() =>
          deleteAccount.mutate(undefined, {
            onSuccess: () => {
              setDeleteOpen(false);
              router.replace("/login");
            },
          })
        }
      />

      <ConfirmationDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t("settings.logout")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        destructive
        loading={logout.isPending}
        onConfirm={() =>
          logout.mutate(undefined, {
            // The mutation itself (see `useLogout`) already revokes the
            // refresh token server-side and clears the query cache — found
            // in Phase 2.5 that nothing navigated afterward, though, so a
            // user stayed on this now-stale protected page until they
            // happened to navigate elsewhere (session was genuinely gone —
            // the *next* navigation correctly redirected to `/login` — this
            // was a UX gap, not a security one). `replace`, not `push`, so
            // logout doesn't leave a back-button entry into the just-ended
            // session's settings page.
            onSuccess: () => {
              setLogoutOpen(false);
              router.replace("/login");
            },
          })
        }
      />
    </FadeIn>
  );
}

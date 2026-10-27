"use client";

import { useTranslations } from "next-intl";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { IconButton } from "@/components/ui/IconButton";
import { Languages } from "lucide-react";

export function LocaleSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale() {
    const nextLocale =
      routing.locales.find((candidate) => candidate !== locale) ?? routing.defaultLocale;
    // Keep the query: `?project=` on a character hub, `?id=` on the app's
    // detail pages. Without it the other language opened an empty page.
    router.replace(`${pathname}${window.location.search}`, { locale: nextLocale });
  }

  return (
    <IconButton aria-label={t("common.a11y.switchLanguage")} onClick={switchLocale} size="sm">
      <Languages className="size-4" aria-hidden="true" />
    </IconButton>
  );
}

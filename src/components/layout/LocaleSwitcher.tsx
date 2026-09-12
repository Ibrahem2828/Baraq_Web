"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { IconButton } from "@/components/ui/IconButton";
import { Languages } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale() {
    const nextLocale =
      routing.locales.find((candidate) => candidate !== locale) ?? routing.defaultLocale;
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <IconButton aria-label="Switch language" onClick={switchLocale} size="sm">
      <Languages className="size-4" aria-hidden="true" />
    </IconButton>
  );
}

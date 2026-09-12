import { defineRouting } from "next-intl/routing";

/**
 * Arabic is the default and canonical locale (Arabic-first identity, per
 * brand direction) and renders RTL; English is the secondary locale and
 * renders LTR. Both are first-class in the routing config from day one —
 * nothing in the app architecture assumes Arabic-only strings.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

export const localeDirection: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

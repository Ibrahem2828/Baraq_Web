import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, localeDirection, type AppLocale } from "@/i18n/routing";
import { fontVariables } from "@/design-system/fonts";
import { ThemeScript } from "@/design-system/ThemeScript";
import { publicEnv } from "@/config/env.public";
import { Providers } from "../providers";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: {
      default: publicEnv.NEXT_PUBLIC_APP_NAME,
      template: `%s · ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
    },
    description: "برّاق — رفيقك الذكي في رحلتك التعليمية",
    icons: { icon: "/favicon.ico" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const direction = localeDirection[locale as AppLocale];

  return (
    <html lang={locale} dir={direction} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

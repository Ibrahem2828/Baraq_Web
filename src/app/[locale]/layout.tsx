import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, localeDirection, type AppLocale } from "@/i18n/routing";
import { fontVariables } from "@/design-system/fonts";
import { ThemeScript } from "@/design-system/ThemeScript";
import { NativeHead } from "@/design-system/NativeHead";
import { publicEnv } from "@/config/env.public";
import { Providers } from "../providers";
import "../globals.css";

// The app build (scripts/build-native.mjs) or the web one. Read here, not
// imported: Next inlines the literal, so the other build's branch is
// removed from this bundle (see docs/MOBILE_APP.md).
const IS_NATIVE = process.env.NEXT_PUBLIC_BUILD_TARGET === "native";

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

// `viewportFit: "cover"` lets the page draw under a phone's notch and home
// indicator (iOS Safari, and a native WebView shell); the shell pads itself
// with `env(safe-area-inset-*)` so nothing interactive sits there. Pinch
// zoom stays enabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e1a" },
  ],
};

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
        {IS_NATIVE ? <NativeHead /> : null}
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

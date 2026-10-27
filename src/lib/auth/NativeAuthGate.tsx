"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LoadingState } from "@/components/feedback/LoadingState";
import { resolveAuthRedirectTarget, PUBLIC_SEGMENTS } from "./resolve-auth-redirect";
import { hasSession, onSessionEnded } from "./native-session";

/** Read by scripts/native-shell/index.html to reopen the app in the last language. */
export const NATIVE_LOCALE_KEY = "baraq_locale";

function segmentsOf(pathname: string): { locale: string | undefined; first: string | undefined } {
  const [locale, first] = pathname.split("/").filter(Boolean);
  return { locale, first };
}

/**
 * The app's stand-in for src/proxy.ts, which does not run in a static
 * export. Same decision (`resolveAuthRedirectTarget`), made on the client
 * from the stored session instead of from cookies: a protected page without
 * a session goes to login with `?next=` (query included, so `view?id=`
 * pages come back to the same record). Until the first check passes a
 * protected page renders nothing, so no request goes out without a token.
 *
 * Also returns to login when the session ends underneath a page (refresh
 * token rejected, logout, account deleted).
 */
export function NativeAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, first } = segmentsOf(pathname);
  const isKnownLocale = (routing.locales as readonly string[]).includes(locale ?? "");
  const isPublic = first !== undefined && PUBLIC_SEGMENTS.has(first);
  // Set once the first protected page's check passes; later navigations are
  // re-checked in the background without unmounting the shell.
  const [sessionConfirmed, setSessionConfirmed] = useState(false);

  useEffect(() => {
    if (!isKnownLocale || !locale) return;
    try {
      window.localStorage.setItem(NATIVE_LOCALE_KEY, locale);
    } catch {
      // Storage unavailable: the app reopens in Arabic.
    }
  }, [isKnownLocale, locale]);

  useEffect(() => {
    if (!isKnownLocale || !locale || isPublic) return;
    let cancelled = false;
    void hasSession()
      .catch(() => false)
      .then((signedIn) => {
        if (cancelled) return;
        const next = `${pathname}${window.location.search}`;
        const target = resolveAuthRedirectTarget(next, locale, first, signedIn);
        if (target) router.replace(target);
        else setSessionConfirmed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, locale, first, isKnownLocale, isPublic, router]);

  useEffect(
    () =>
      onSessionEnded(() => {
        setSessionConfirmed(false);
        const current = segmentsOf(window.location.pathname);
        router.replace(`/${current.locale ?? routing.defaultLocale}/login/`);
      }),
    [router],
  );

  if (isKnownLocale && !isPublic && !sessionConfirmed) {
    return <LoadingState />;
  }
  return children;
}

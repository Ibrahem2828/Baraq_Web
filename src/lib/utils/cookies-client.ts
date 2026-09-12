"use client";

/** Reads a cookie by name from `document.cookie`. Client-side only — never use for HttpOnly cookies (they aren't readable here by design). */
export function readClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

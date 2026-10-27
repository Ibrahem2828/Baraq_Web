import { publicEnv } from "@/config/env.public";

/**
 * The app's Content-Security-Policy. A static export has no response
 * headers, so the policy next.config.ts sends on the web is a <meta> tag
 * here, first in <head>. It matches the web's, plus the one origin the app
 * talks to directly (the API; the web reaches it through its own server).
 * `frame-ancestors` cannot be set from a <meta> tag and does not apply to a
 * WebView's top-level page.
 */
export function nativeContentSecurityPolicy(apiBaseUrl: string): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${apiBaseUrl}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function NativeHead() {
  return (
    <meta
      httpEquiv="Content-Security-Policy"
      content={nativeContentSecurityPolicy(publicEnv.NEXT_PUBLIC_API_BASE_URL)}
    />
  );
}

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.APP_ENV === "production";

// Security headers, ported from the pattern already validated in
// Baraq_Dashboard_Professional's next.config.ts, upgraded slightly (CSP
// documents the inline-script exception instead of silently allowing it).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required for the theme-boot script in the root
      // layout (see src/design-system/ThemeScript.tsx) which must run before
      // first paint to avoid a flash of the wrong theme; it has no
      // user-controlled interpolation. Revisit with a nonce-based CSP if the
      // build pipeline adds nonce support for inline scripts.
      // 'unsafe-eval' is dev-only: React dev mode uses eval() to reconstruct
      // stack traces for its debugging overlay (never in production builds —
      // verified this doesn't leak into the prod CSP below).
      `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.baraqapp.com", pathname: "/media/**" },
      { protocol: "https", hostname: "baraqapp.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);

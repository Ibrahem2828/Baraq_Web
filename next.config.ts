import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Gated on NODE_ENV, not APP_ENV. Next resolves `headers()` during
// `next build` and bakes the result into routes-manifest.json; it is never
// re-evaluated at runtime. The production image's builder stage does not set
// APP_ENV, so gating on it silently shipped `'unsafe-eval'` in the production
// CSP and dropped HSTS entirely, no matter what compose set at runtime.
// `next build` always sets NODE_ENV=production, and NODE_ENV is also the flag
// React itself keys its eval()-based dev overlay off, so it is the signal
// this condition actually means.
const isProduction = process.env.NODE_ENV === "production";

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
      // stack traces for its debugging overlay. This previously DID leak into
      // production -- routes-manifest.json from a real build carried
      // 'unsafe-eval' -- because the gate above read a variable the build
      // stage never set. Verify it the only way that proves anything: build,
      // then read the CSP out of .next/routes-manifest.json.
      `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
      // The application deliberately uses system-font fallbacks (see
      // design-system/fonts.ts), so no third-party font origin belongs in the
      // production CSP or in the build dependency graph.
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
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
  skipTrailingSlashRedirect: true,
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

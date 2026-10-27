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

// `BUILD_TARGET=native` (scripts/build-native.mjs) builds the static export
// packaged into the mobile app; anything else is the web server build.
const isNativeBuild = process.env.BUILD_TARGET === "native";

// A route file named `*.web.ts(x)` exists only on the web (the BFF and auth
// route handlers, the `[id]` detail pages, the server-read join page);
// `*.native.tsx` only in the app (its `view?id=` detail pages
// and client-read join page). Plain `page.tsx` is shared. Next resolves a
// route file by its extension, so `page.web.tsx` is not a page in the app
// build and `page.native.tsx` is not one on the web.
const pageExtensions = isNativeBuild
  ? ["native.tsx", "native.ts", "tsx", "ts"]
  : ["web.tsx", "web.ts", "tsx", "ts"];

// Inlined into client code as a literal for both builds. Unset, Next leaves
// `process.env.NEXT_PUBLIC_BUILD_TARGET` as a runtime lookup and neither
// build's `IS_NATIVE` branches are removed (the web bundle carried the app's
// token code, and the reverse).
const buildTargetEnv = { NEXT_PUBLIC_BUILD_TARGET: isNativeBuild ? "native" : "web" };

const nativeConfig: NextConfig = {
  env: buildTargetEnv,
  output: "export",
  pageExtensions,
  // With `output: "export"` this is the exported bundle itself (Capacitor's
  // webDir). Build intermediates still go to .next, so an app build replaces
  // a local web production build there (never .next/dev).
  distDir: "out",
  // Every page exported as `<route>/index.html`, the layout
  // scripts/native-shell/index.html resolves a path to.
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // No image server in the app; the images that ship are already WebP and
  // sized for how they are shown (see src/assets/assets.ts).
  images: { unoptimized: true },
  // Response headers do not exist in a static export; the app's CSP is a
  // <meta> tag (src/design-system/NativeHead.tsx).
};

const webConfig: NextConfig = {
  env: buildTargetEnv,
  pageExtensions,
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

export default withNextIntl(isNativeBuild ? nativeConfig : webConfig);

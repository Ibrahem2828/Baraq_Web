import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Android (and later iOS) shell around the static app build.
 * `npm run build:native` produces `out/`; `npx cap sync android` copies it
 * into android/app/src/main/assets/public. See docs/MOBILE_APP.md.
 */
const config: CapacitorConfig = {
  appId: "com.baraq.app",
  appName: "برّاق",
  webDir: "out",
  android: {
    // Nothing but the bundled pages and the HTTPS API is ever loaded.
    allowMixedContent: false,
    // webContentsDebuggingEnabled is left to Capacitor's default: remote
    // debugging (chrome://inspect) in debug builds only, never in release.
  },
  server: {
    // The WebView origin is https://localhost: a secure context (so the
    // Web Crypto and storage APIs behave as on the web), and the one
    // origin the backend's CORS list names for the app.
    androidScheme: "https",
    hostname: "localhost",
  },
  plugins: {
    // Edge to edge: on WebView 140+ the page honours its
    // `viewport-fit=cover` and env(safe-area-inset-*) carries the real
    // insets (globals.css and the shell pad with them); older WebViews are
    // padded by Capacitor itself and report 0.
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;

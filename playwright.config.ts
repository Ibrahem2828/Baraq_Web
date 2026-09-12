import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Local-only fallback (Phase 2.5): this sandbox's network egress blocks
    // `playwright install`'s browser download, but Playwright's `channel`
    // feature can drive an already-installed system browser directly with
    // no download at all. Gated to non-CI so the intended CI path (bundled
    // Chromium via a real `playwright install` step) is completely
    // unaffected — this project simply doesn't exist when `CI` is set, and
    // silently doesn't run at all on a non-CI machine without Edge
    // installed (Playwright errors clearly if the channel is missing,
    // rather than silently skipping — acceptable for an opt-in local
    // fallback, not the primary suite).
    ...(process.env.CI ? [] : [{ name: "msedge", use: { channel: "msedge" as const } }]),
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

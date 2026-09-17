import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test(
    "root redirects to the default Arabic locale and renders RTL",
    // `next-intl`'s locale negotiation genuinely honors the browser's
    // Accept-Language header when there's no locale cookie yet (correct
    // i18n behavior, not a bug — verified manually in Phase 1/2) — so this
    // test must pin a locale that doesn't prefer English, or it's
    // environment-dependent (found live in Phase 2.5: it failed under a
    // real Edge browser whose default reported "en", not because the app
    // was wrong, but because the test's assumption was implicit).
    { tag: "@locale-ar" },
    async ({ browser }) => {
      const context = await browser.newContext({ locale: "ar-SA" });
      const page = await context.newPage();
      await page.goto("/");
      await expect(page).toHaveURL(/\/ar(\/|$)/);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await context.close();
    },
  );

  test("unauthenticated visitor is redirected to login when visiting a protected route", async ({
    page,
  }) => {
    await page.goto("/ar/library");
    await expect(page).toHaveURL(/\/ar\/login/);
  });

  test("login page renders the expected form fields", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();
    await expect(page.getByRole("button", { name: "دخول" })).toBeVisible();
  });

  test("English locale renders LTR", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

/**
 * Authenticated flows against a real backend. Requires a reachable Django
 * instance seeded with the backend's own `seed_demo_data` management
 * command (see docs/BACKEND_INTEGRATION_STATUS.md) — these are skipped
 * automatically (not failed) when `E2E_BACKEND_AVAILABLE` isn't set, so a
 * plain `npm run test:e2e` without a backend running doesn't report false
 * failures. Added in Phase 2.5 alongside the auth-regression bugs found and
 * fixed the same session (open-redirect double-locale-prefix, missing
 * post-logout navigation) — this is the regression coverage for both.
 */
test.describe("authenticated flows", () => {
  const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL;
  const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD;
  test.skip(
    !process.env.E2E_BACKEND_AVAILABLE || !STUDENT_EMAIL || !STUDENT_PASSWORD,
    "Requires a reachable backend and E2E_STUDENT_EMAIL/E2E_STUDENT_PASSWORD supplied through the test secret store.",
  );

  async function login(page: import("@playwright/test").Page, next?: string) {
    if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
      throw new Error("E2E credentials are not configured");
    }
    await page.goto(next ? `/ar/login?next=${encodeURIComponent(next)}` : "/ar/login");
    await page.getByLabel("البريد الإلكتروني").fill(STUDENT_EMAIL);
    await page.getByLabel("كلمة المرور").fill(STUDENT_PASSWORD);
    await page.getByRole("button", { name: "دخول" }).click();
  }

  test("successful login lands on Home with real user data", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/ar\/?$/);
    // Real backend-sourced content, not a static string — confirms the
    // BFF→Django round trip actually happened, not a client-only redirect.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("legitimate ?next= is honored post-login without a double locale prefix", async ({
    page,
  }) => {
    // Regression test for a real bug found in Phase 2.5: the locale-aware
    // router double-prefixed an already-locale-prefixed `next` value
    // (`/ar/study-plans` → `/ar/ar/study-plans`, a 404).
    await login(page, "/ar/study-plans");
    await expect(page).toHaveURL(/\/ar\/study-plans$/);
    await expect(page.getByRole("heading", { name: "خطط الدراسة" })).toBeVisible();
  });

  test("open-redirect attempts never leave the app's origin", async ({ page }) => {
    await login(page, "//evil.example.com");
    await expect(page).toHaveURL("http://localhost:3000/ar");
  });

  test("Khota hub, Today, and Week render real data", async ({ page }) => {
    await login(page);
    await page.goto("/ar/characters/khota");
    await expect(page.getByText("رفيقك في التخطيط الدراسي")).toBeVisible();

    await page.goto("/ar/characters/khota/today");
    await expect(page.getByRole("heading", { name: "مهام اليوم" })).toBeVisible();

    await page.goto("/ar/characters/khota/week");
    await expect(page.getByRole("heading", { name: "خطة الأسبوع" })).toBeVisible();
  });

  test("theme preference persists across reload", async ({ page }) => {
    await login(page);
    await page.evaluate(() => {
      window.localStorage.setItem(
        "baraq_theme",
        JSON.stringify({ state: { preference: "fire" }, version: 0 }),
      );
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "fire");
  });

  test("logout clears the session and redirects to login", async ({ page }) => {
    // Regression test for a real bug found in Phase 2.5: logout revoked the
    // session correctly server-side but never navigated anywhere, leaving
    // the user stranded on a stale protected page.
    await login(page);
    await page.goto("/ar/settings");
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await page.getByRole("button", { name: "تأكيد" }).click();
    await expect(page).toHaveURL(/\/ar\/login/);

    await page.goto("/ar/library");
    await expect(page).toHaveURL(/\/ar\/login/);
  });
});

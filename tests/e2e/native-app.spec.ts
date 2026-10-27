import { test, expect, type Page } from "@playwright/test";

/**
 * The app build (`npm run build:native`) served the way Capacitor's Android
 * WebView serves it (`node scripts/serve-native.mjs`), against a real
 * backend whose CORS list names this origin. Nothing here reaches a web
 * server: the page is static files, the API is Django.
 *
 *   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build:native
 *   node scripts/serve-native.mjs 3030
 *   E2E_NATIVE=1 E2E_BACKEND_AVAILABLE=1 E2E_STUDENT_EMAIL=… E2E_STUDENT_PASSWORD=… \
 *     PLAYWRIGHT_BASE_URL=http://localhost:3030 npx playwright test tests/e2e/native-app.spec.ts
 *
 * In a desktop browser the secure-storage plugin falls back to localStorage
 * (key `baraq_refresh`); on a phone the same calls use the Keystore.
 */
const EMAIL = process.env.E2E_STUDENT_EMAIL;
const PASSWORD = process.env.E2E_STUDENT_PASSWORD;
const REFRESH_KEY = "baraq_refresh";

test.skip(
  !process.env.E2E_NATIVE || !process.env.E2E_BACKEND_AVAILABLE || !EMAIL || !PASSWORD,
  "Runs against the app build (E2E_NATIVE=1) with a reachable backend and E2E credentials.",
);

// One account, one sequence: the backend throttles repeated logins.
test.describe.configure({ mode: "serial" });

/** Every request the page makes, to prove what it does not call. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  return urls;
}

async function signIn(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ar\/login\/\?next=/);
  await page.getByLabel("البريد الإلكتروني").fill(EMAIL!);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD!);
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/ar\/$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("app build", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("signs in against the API directly: Bearer token, no cookies, no BFF", async ({ page }) => {
    const urls = recordRequests(page);
    await signIn(page);

    expect(urls.some((url) => url.includes("/api/v1/auth/login/"))).toBe(true);
    expect(urls.filter((url) => url.includes("/api/bff") || url.includes("/api/auth/"))).toEqual(
      [],
    );
    // No session cookie of any kind, and the access token is not persisted.
    expect(await page.context().cookies()).toEqual([]);
    const stored = await page.evaluate(() => ({ ...window.localStorage }));
    expect(Object.keys(stored).filter((key) => /access/i.test(key))).toEqual([]);
    expect(stored[REFRESH_KEY]).toBeTruthy();
  });

  test("a detail page opens by click and survives a cold reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/ar/quizzes/");
    await page.getByText("اختبار الإعراب والنصوص").first().click();
    await expect(page).toHaveURL(/\/ar\/quizzes\/view\/\?id=\d+$/);
    const title = page.getByRole("heading", { level: 1, name: "اختبار الإعراب والنصوص" });
    await expect(title).toBeVisible();

    // A reload goes through scripts/native-shell/index.html, as a cold
    // start on the phone does, and restores the session from storage.
    await page.reload();
    await expect(title).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/quizzes\/view\/\?id=\d+$/);
  });

  test("switching language keeps the record and the app reopens in it", async ({ page }) => {
    await signIn(page);
    await page.goto("/ar/quizzes/view/?id=4");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "القائمة" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "تغيير اللغة" }).click();
    await expect(page).toHaveURL(/\/en\/quizzes\/view\/\?id=4$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("uploads a source with the Bearer token (multipart, cross-origin)", async ({ page }) => {
    await signIn(page);
    await page.goto("/ar/library/");
    await page.getByRole("button", { name: "رفع مصدر" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "native-upload.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("مصدر تجريبي من اختبار التطبيق.\n".repeat(20)),
    });
    await dialog.getByLabel("العنوان").fill(`تطبيق ${Date.now()}`);
    const upload = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/student-sources/") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "رفع" }).last().click();
    const response = await upload;
    expect(response.status()).toBe(201);
    expect(response.request().headers()["authorization"]).toMatch(/^Bearer /);
  });

  test("a rejected refresh token ends the session", async ({ page }) => {
    await signIn(page);
    await page.evaluate((key) => window.localStorage.setItem(key, "not-a-token"), REFRESH_KEY);
    await page.reload();
    await expect(page).toHaveURL(/\/ar\/login\/\?next=/);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), REFRESH_KEY)).toBeNull();
  });

  test("logout revokes and forgets the session", async ({ page }) => {
    const urls = recordRequests(page);
    await signIn(page);
    await page.getByRole("button", { name: "القائمة" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page).toHaveURL(/\/ar\/login\//);
    expect(urls.some((url) => url.includes("/api/v1/auth/logout/"))).toBe(true);
    expect(await page.evaluate((key) => window.localStorage.getItem(key), REFRESH_KEY)).toBeNull();

    await page.goto("/ar/library/");
    await expect(page).toHaveURL(/\/ar\/login\/\?next=%2Far%2Flibrary%2F/);
  });

  test("core pages fit a 320px phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await signIn(page);
    for (const route of ["/ar/", "/ar/library/", "/ar/quizzes/", "/ar/settings/"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, route).toBeLessThanOrEqual(clientWidth);
    }
  });
});

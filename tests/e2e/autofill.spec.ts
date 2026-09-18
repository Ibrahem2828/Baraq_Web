import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * Browser-runtime proof for the autofill path.
 *
 * jsdom can only show that the sync helper reads the DOM. It cannot show that
 * a real browser's React build, running the real production bundle, submits
 * what the user can see. These run against `next start` in a real browser
 * engine, fill controls the way a password manager does — assigning `.value`
 * and dispatching nothing — and then click the actual submit button.
 */

/**
 * Write a value the way browser autofill / a password manager does: set the
 * property and dispatch no `input`, `change` or `blur` event whatsoever, so
 * React's onChange never runs and its state stays empty.
 */
async function autofill(page: Page, selector: string, value: string) {
  await page.$eval(
    selector,
    (element, v) => {
      (element as HTMLInputElement).value = v as string;
    },
    value,
  );
}

function bodyOf(request: Request): Record<string, unknown> {
  return JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
}

/**
 * Visible field-error messages only. The page always carries an empty
 * `role="alert"` live region for toasts, so counting alert *elements* would
 * never reach zero; what matters is whether any error text is shown.
 */
async function errorMessages(page: Page): Promise<string[]> {
  const texts = await page.locator('[role="alert"]').allTextContents();
  return texts.map((text) => text.trim()).filter(Boolean);
}

test.describe("password-manager autofill, real browser", () => {
  test("/ar/login submits the visible credentials", async ({ page }) => {
    const consoleText: string[] = [];
    page.on("console", (message) => consoleText.push(message.text()));

    await page.goto("/ar/login");
    await page.waitForSelector('input[name="email"]');

    await autofill(page, 'input[name="email"]', "saved.student@example.com");
    await autofill(page, 'input[name="password"]', "SavedByManager123!");

    const submission = page.waitForRequest(
      (request) => request.url().includes("/api/auth/login") && request.method() === "POST",
    );
    await page.click('button[type="submit"]');
    const request = await submission;

    // The reported symptom: a visibly-filled field rejected as empty.
    expect(bodyOf(request)).toEqual({
      email: "saved.student@example.com",
      password: "SavedByManager123!",
    });

    // No client-side "this field is required" on a field the user can see.
    expect(await errorMessages(page)).toEqual([]);

    // The password must never reach the console.
    expect(consoleText.join("\n")).not.toContain("SavedByManager123!");
  });

  test("/ar/login still blocks an invalid autofilled email (Zod runs)", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForSelector('input[name="email"]');

    await autofill(page, 'input[name="email"]', "not-an-email");
    await autofill(page, 'input[name="password"]', "SavedByManager123!");

    let submitted = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/login")) submitted = true;
    });

    await page.click('button[type="submit"]');
    await expect
      .poll(async () => (await errorMessages(page)).length)
      .toBeGreaterThan(0);
    expect(submitted).toBe(false);
  });

  test("a stale required error clears once autofill is synchronized", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForSelector('input[name="email"]');

    // First submit on an empty form: real validation errors appear.
    await page.click('button[type="submit"]');
    await expect
      .poll(async () => (await errorMessages(page)).length)
      .toBeGreaterThan(0);

    // Now the password manager fills both fields, still dispatching nothing.
    await autofill(page, 'input[name="email"]', "saved.student@example.com");
    await autofill(page, 'input[name="password"]', "SavedByManager123!");

    const submission = page.waitForRequest(
      (request) => request.url().includes("/api/auth/login") && request.method() === "POST",
    );
    await page.click('button[type="submit"]');
    await submission;

    // The stale errors must not survive a submit that is now valid.
    await expect.poll(async () => await errorMessages(page)).toEqual([]);
  });

  test("/ar/register submits every autofilled field", async ({ page }) => {
    const consoleText: string[] = [];
    page.on("console", (message) => consoleText.push(message.text()));

    await page.goto("/ar/register");
    await page.waitForSelector('input[name="email"]');

    await autofill(page, 'input[name="full_name"]', "Saved Student");
    await autofill(page, 'input[name="email"]', "saved.student@example.com");
    await autofill(page, 'input[name="phone_number"]', "0500000000");
    await autofill(page, 'input[name="password"]', "SavedByManager123!");
    await autofill(page, 'input[name="password_confirm"]', "SavedByManager123!");

    const submission = page.waitForRequest(
      (request) => request.url().includes("/api/bff/auth/register") && request.method() === "POST",
    );
    await page.click('button[type="submit"]');
    const request = await submission;

    expect(bodyOf(request)).toMatchObject({
      full_name: "Saved Student",
      email: "saved.student@example.com",
      password: "SavedByManager123!",
      password_confirm: "SavedByManager123!",
    });
    expect(await errorMessages(page)).toEqual([]);
    expect(consoleText.join("\n")).not.toContain("SavedByManager123!");
  });

  test("/ar/register keeps blocking a mismatched password confirmation", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForSelector('input[name="email"]');

    await autofill(page, 'input[name="full_name"]', "Saved Student");
    await autofill(page, 'input[name="email"]', "saved.student@example.com");
    await autofill(page, 'input[name="password"]', "SavedByManager123!");
    await autofill(page, 'input[name="password_confirm"]', "DifferentValue123!");

    let submitted = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/bff/auth/register")) submitted = true;
    });

    await page.click('button[type="submit"]');
    await expect
      .poll(async () => (await errorMessages(page)).length)
      .toBeGreaterThan(0);
    expect(submitted).toBe(false);
  });
});

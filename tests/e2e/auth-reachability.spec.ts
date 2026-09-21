import { test, expect } from "@playwright/test";

/**
 * Regression coverage for the auth-UX bug fixed in this pass:
 * `src/proxy.ts` used to redirect a visitor *away* from `/login` and
 * `/register` whenever an access or refresh cookie merely existed, with no
 * verification that the cookie was actually still valid. A stale, expired,
 * or simply fake cookie permanently bounced a real user away from the one
 * page that could fix it. See `src/lib/auth/resolve-auth-redirect.ts` for
 * the fixed decision logic and its own unit tests
 * (tests/unit/proxy-auth-routing.test.ts) for the non-browser-dependent
 * half of this coverage.
 *
 * `smoke.spec.ts` and `autofill.spec.ts` already cover real login, the
 * locale-preserving `?next=` redirect, open-redirect rejection, autofill
 * submission on both login and register, and logout. This file covers what
 * neither did: that login/register stay reachable under every cookie
 * state, and the register/English-locale structural checks the brief for
 * this fix specifically calls for.
 */

test.describe("auth pages are always reachable — cookie state must not matter", () => {
  test("a fake access cookie does not hide the login form", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "baraq_access",
        value: "not-a-real-token",
        domain: new URL(page.url() || "http://localhost:3000").hostname || "localhost",
        path: "/",
      },
    ]);
    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("a fake refresh cookie does not hide the login form", async ({ page }) => {
    await page.goto("/en"); // establish the origin before setting a cookie on it
    await page.context().addCookies([
      {
        name: "baraq_refresh",
        value: "expired-or-revoked-refresh-token",
        domain: new URL(page.url()).hostname,
        path: "/",
      },
    ]);
    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("a fake refresh cookie does not hide the register form", async ({ page }) => {
    await page.goto("/ar");
    await page.context().addCookies([
      {
        name: "baraq_refresh",
        value: "expired-or-revoked-refresh-token",
        domain: new URL(page.url()).hostname,
        path: "/",
      },
    ]);
    await page.goto("/ar/register");
    await expect(page).toHaveURL(/\/ar\/register$/);
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
  });

  test("both cookies present and fake still does not hide login", async ({ page }) => {
    await page.goto("/en");
    await page.context().addCookies([
      {
        name: "baraq_access",
        value: "fake-access",
        domain: new URL(page.url()).hostname,
        path: "/",
      },
      {
        name: "baraq_refresh",
        value: "fake-refresh",
        domain: new URL(page.url()).hostname,
        path: "/",
      },
    ]);
    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

test.describe("English locale auth pages", () => {
  test("/en/login renders the login form and links to Create account", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
  });

  test("/en/register renders the register form and links to Sign in", async ({ page }) => {
    await page.goto("/en/register");
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("Create account on /en/login navigates to /en/register", async ({ page }) => {
    await page.goto("/en/login");
    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/en\/register$/);
  });

  test("Sign in on /en/register navigates to /en/login", async ({ page }) => {
    await page.goto("/en/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});

test.describe("Arabic locale auth pages", () => {
  test("/ar/login exposes إنشاء حساب", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.getByRole("link", { name: "إنشاء حساب" })).toBeVisible();
  });

  test("/ar/register exposes تسجيل الدخول", async ({ page }) => {
    await page.goto("/ar/register");
    await expect(page.getByRole("link", { name: "تسجيل الدخول" })).toBeVisible();
  });
});

test.describe("wrong credentials", () => {
  test("a wrong password shows an error and stays on /en/login", async ({ page }) => {
    await page.goto("/en/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("DefinitelyWrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});

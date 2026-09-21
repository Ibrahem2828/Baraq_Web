import { expect, test, type Request } from "@playwright/test";

function jsonBody(request: Request): Record<string, unknown> {
  return JSON.parse(request.postData() ?? "{}") as Record<string, unknown>;
}

/**
 * Real-browser coverage of the pending-registration contract. The two API
 * boundaries are deliberately mocked here: Django's API tests prove that a
 * verified OTP creates the account atomically, while this test proves the
 * production Next.js bundle neither treats registration as a session nor
 * exposes the submitted password while routing to verification.
 */
test.describe("pending registration and email OTP", () => {
  test("registration creates no browser session, then exposes a safe OTP retry path", async ({
    page,
  }) => {
    const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000").origin;
    await page.context().addCookies([
      { name: "baraq_csrf", value: "browser-test-csrf", url: origin },
    ]);

    let registration: Record<string, unknown> | undefined;
    let verification: Record<string, unknown> | undefined;
    let resend: Record<string, unknown> | undefined;

    await page.route("**/api/bff/auth/register", async (route) => {
      registration = jsonBody(route.request());
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Verification required",
          data: {
            verification_required: true,
            email: "new.student@example.com",
            expires_in: 600,
            resend_after_seconds: 0,
          },
        }),
      });
    });
    await page.route("**/api/auth/verify-email", async (route) => {
      verification = jsonBody(route.request());
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Incorrect code",
          code: "otp_invalid",
          errors: { code: ["Incorrect code"] },
        }),
      });
    });
    await page.route("**/api/bff/auth/resend-otp", async (route) => {
      resend = jsonBody(route.request());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OTP resent",
          data: {
            message: "OTP resent",
            expires_in: 600,
            resend_after_seconds: 60,
          },
        }),
      });
    });

    await page.goto("/en/register");
    await page.getByLabel("Full name").fill("New Student");
    await page.getByLabel("Email").fill("New.Student@Example.COM");
    await page.getByLabel("Password", { exact: true }).fill("SafePassword123!");
    await page.getByLabel("Confirm password").fill("SafePassword123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(
      /\/en\/verify-email\?email=new.student%40example.com&expires_in=600&resend_after=0$/,
    );
    expect(registration).toMatchObject({
      full_name: "New Student",
      email: "New.Student@Example.COM",
      password: "SafePassword123!",
      password_confirm: "SafePassword123!",
    });
    // Registering must not set either authenticated cookie; only a successful
    // verification route handler may do that.
    expect((await page.context().cookies()).map((cookie) => cookie.name)).not.toEqual(
      expect.arrayContaining(["baraq_access", "baraq_refresh"]),
    );
    await expect(page.getByText("We sent a 6-digit code to ne••••@example.com")).toBeVisible();

    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Incorrect code")).toBeVisible();
    expect(verification).toEqual({ email: "new.student@example.com", code: "123456" });
    await expect(page).toHaveURL(/\/en\/verify-email/);

    await page.getByRole("button", { name: "Resend" }).click();
    await expect(page.getByText("A new code has been sent to your email")).toBeVisible();
    expect(resend).toEqual({ email: "new.student@example.com" });
  });
});

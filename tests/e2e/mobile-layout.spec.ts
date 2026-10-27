import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Phone layout guards. At 320px the top bar alone (six controls) used to be
 * wider than the screen, and a four-tab row on the project page did the
 * same; both made every page scroll sideways because the shell's column had
 * no `min-w-0`. Each viewport runs as a real touch device (`isMobile`,
 * `hasTouch`), so `pointer: coarse` styles apply as they do on a phone.
 */
const PHONES = [
  { name: "320 portrait", width: 320, height: 640 },
  { name: "390 portrait", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
] as const;

async function phonePage(
  browser: Browser,
  viewport: { width: number; height: number },
  storageState?: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>,
) {
  const context = await browser.newContext({
    viewport,
    isMobile: true,
    hasTouch: true,
    storageState,
  });
  return { context, page: await context.newPage() };
}

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth, culprits } = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const outside = (el: Element) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.right > width + 1 || box.left < -1);
    };
    // The innermost elements past the edge: those are the ones to fix.
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => outside(el) && ![...el.children].some(outside))
      .slice(0, 5)
      .map((el) => `<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}">`);
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: width, culprits };
  });
  expect(
    scrollWidth,
    `${page.url()} scrolls sideways; past the edge: ${culprits.join(" ")}`,
  ).toBeLessThanOrEqual(clientWidth);
}

test.describe("phone layout: public pages", () => {
  for (const phone of PHONES) {
    for (const path of ["/ar/login", "/en/login", "/ar/register", "/en/register"]) {
      test(`${path} fits ${phone.name}`, async ({ browser }) => {
        const { context, page } = await phonePage(browser, phone);
        await page.goto(path);
        await expect(page.getByRole("textbox").first()).toBeVisible();
        await expectNoSidewaysScroll(page);
        await context.close();
      });
    }
  }

  test("form fields use 16px text on touch screens (iOS zooms on anything smaller)", async ({
    browser,
  }) => {
    const { context, page } = await phonePage(browser, PHONES[1]);
    await page.goto("/en/login");
    const fontSize = await page
      .getByLabel("Email")
      .evaluate((element) => getComputedStyle(element).fontSize);
    expect(fontSize).toBe("16px");
    await context.close();
  });
});

test.describe("phone layout: signed-in shell", () => {
  const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL;
  const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD;
  test.skip(
    !process.env.E2E_BACKEND_AVAILABLE || !STUDENT_EMAIL || !STUDENT_PASSWORD,
    "Requires a reachable backend and E2E_STUDENT_EMAIL/E2E_STUDENT_PASSWORD supplied through the test secret store.",
  );

  // One login for the whole block, like the smoke suite: the backend
  // throttles repeated logins from one address.
  let storageState: Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/ar/login");
    await page.getByLabel("البريد الإلكتروني").fill(STUDENT_EMAIL!);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(STUDENT_PASSWORD!);
    await page.getByRole("button", { name: "دخول" }).click();
    await page.waitForURL((url) => url.pathname !== "/ar/login", { timeout: 10_000 });
    storageState = await context.storageState();
    await context.close();
  });

  const ROUTES = [
    "/",
    "/library",
    "/study-plans",
    "/quizzes",
    "/projects",
    "/characters/khota/today",
    "/characters/khota/week",
    "/notifications",
    "/subscription",
    "/settings",
  ];

  for (const phone of PHONES) {
    for (const locale of ["ar", "en"]) {
      test(`core routes fit ${phone.name} (${locale})`, async ({ browser }) => {
        const { context, page } = await phonePage(browser, phone, storageState);
        for (const route of ROUTES) {
          await page.goto(`/${locale}${route === "/" ? "" : route}`);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expectNoSidewaysScroll(page);
        }
        await context.close();
      });
    }
  }

  test("top bar controls are 44px touch targets at 320px", async ({ browser }) => {
    const { context, page } = await phonePage(browser, PHONES[0], storageState);
    await page.goto("/en");
    const banner = page.getByRole("banner");
    for (const name of ["Menu", "Notifications", "Profile"]) {
      const box = await banner
        .getByRole(name === "Notifications" ? "link" : "button", { name })
        .boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.width, name).toBeGreaterThanOrEqual(44);
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
    // Language and theme moved into the menu drawer on a phone.
    await banner.getByRole("button", { name: "Menu" }).click();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Switch language" }),
    ).toBeVisible();
    await context.close();
  });
});

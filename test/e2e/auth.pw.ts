import { expect, test } from "@playwright/test";

const authBypassEnabled = process.env.E2E_BYPASS_AUTH === "true";

test("unauthenticated /editor requests redirect to /sign-in", async ({ page }) => {
  test.skip(authBypassEnabled, "Redirect assertions are disabled when E2E_BYPASS_AUTH=true.");

  await page.goto("/editor");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign-in page renders authentication provider controls", async ({ page }, testInfo) => {
  await page.goto("/sign-in");

  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();

  const screenshotPath = testInfo.outputPath("sign-in-page.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach("sign-in-page", {
    path: screenshotPath,
    contentType: "image/png",
  });
});

import { test, expect } from "playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to /sign-in", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
    expect(page.url()).toContain("callbackUrl=%2Fdashboard");

    await context.close();
  });

  test("sign-in page shows sign-in options", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/sign-in");
    // In E2E mode (no Google creds), email form is shown; in production, Google OAuth button is shown
    const hasGoogle = await page.getByText("Continue with Google").isVisible().catch(() => false);
    const hasSignIn = await page.getByText("Sign in").first().isVisible().catch(() => false);
    expect(hasGoogle || hasSignIn).toBeTruthy();

    await context.close();
  });

  test("authenticated user can access /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("sign out clears session", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");

    await page.getByRole("button", { name: "Sign Out" }).click();

    // Should be redirected to sign-in
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });

  test("callbackUrl is preserved on redirect", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/editor/some-id");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("callbackUrl=%2Feditor%2Fsome-id");

    await context.close();
  });

  test("accessing /sign-in while authenticated redirects to dashboard", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain("/dashboard");
  });
});

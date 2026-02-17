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

  test("sign-in page shows Google OAuth button", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/sign-in");
    await expect(page.getByText("Continue with Google")).toBeVisible();

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

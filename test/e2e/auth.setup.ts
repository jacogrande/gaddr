import { test as setup, expect } from "playwright/test";

const AUTH_FILE = "test/e2e/.auth/user.json";

/**
 * Authenticate before E2E tests.
 *
 * For local development: set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars,
 * or run against a preview deployment with pre-seeded OAuth test accounts.
 *
 * For CI: uses Vercel preview URL with seeded test user via Better Auth's
 * email+password provider (enabled only in test environments).
 */
setup("authenticate", async ({ page }) => {
  // Navigate to sign-in
  await page.goto("/sign-in");

  // Wait for the page to load — OAuth buttons should be visible
  await expect(page.locator("text=Sign in")).toBeVisible();

  // If a test email/password provider is available (test environment only),
  // use it for deterministic auth. Otherwise, the test relies on pre-existing
  // storageState from a manual login saved to AUTH_FILE.
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (testEmail && testPassword) {
    // Better Auth email+password flow (test env only)
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/dashboard");
  } else {
    // Skip auth setup — tests will use existing storageState if available.
    // To create initial storageState:
    //   1. Run `bunx playwright test --headed` and manually sign in via OAuth
    //   2. The browser context will be saved to test/e2e/.auth/user.json
    setup.skip(true, "No test credentials configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD, or manually create test/e2e/.auth/user.json");
  }

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});

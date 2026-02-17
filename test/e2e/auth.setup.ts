import { test as setup, expect } from "playwright/test";

const AUTH_FILE = "test/e2e/.auth/user.json";
const TEST_EMAIL = "e2e@test.local";
const TEST_PASSWORD = "TestPassword123!";

/**
 * Authenticate before E2E tests.
 *
 * Seeds a test user via the /api/test/seed endpoint (requires E2E_TESTING=true),
 * then signs in via Better Auth's email+password flow and saves the session.
 */
setup("authenticate", async ({ request, page }) => {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

  // Seed the test user (idempotent)
  const seedResponse = await request.post(`${baseURL}/api/test/seed`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: "E2E Test User" },
  });
  expect(seedResponse.ok()).toBeTruthy();

  // Sign in via Better Auth email+password endpoint
  const signInResponse = await request.post(
    `${baseURL}/api/auth/sign-in/email`,
    {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    },
  );
  expect(signInResponse.ok()).toBeTruthy();

  // Navigate to dashboard to ensure cookies are captured in browser context
  await page.goto("/dashboard");
  await expect(page.locator("body")).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});

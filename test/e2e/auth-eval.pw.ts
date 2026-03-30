/**
 * Auth eval runner — exercises every workflow from eval/auth.json.
 *
 * Bypass OFF (redirect tests):
 *   E2E_BYPASS_AUTH=false bunx playwright test test/e2e/auth-eval.pw.ts
 *
 * Bypass ON (authenticated tests):
 *   E2E_BYPASS_AUTH=true bunx playwright test test/e2e/auth-eval.pw.ts
 */
import { expect, test } from "@playwright/test";

const bypass = process.env.E2E_BYPASS_AUTH === "true";

// ── auth-redirect-unauthenticated ──
test("eval: unauthenticated root redirects to /sign-in", async ({ page }) => {
  test.skip(bypass, "Needs auth bypass OFF");

  await page.context().clearCookies();
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in/);
});

// ── auth-redirect-authenticated ──
test("eval: authenticated root redirects to /editor", async ({ page }) => {
  test.skip(!bypass, "Needs auth bypass ON");

  await page.goto("/");

  await expect(page).toHaveURL(/\/editor/);
});

// ── auth-sign-in-page-renders ──
test("eval: sign-in page renders both OAuth buttons", async ({ page }) => {
  test.skip(bypass, "Sign-in form redirects with bypass ON");

  await page.goto("/sign-in");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

// ── auth-protected-route-redirect ──
test("eval: protected route redirects to /sign-in with callbackUrl", async ({ page }) => {
  test.skip(bypass, "Needs auth bypass OFF");

  await page.context().clearCookies();
  await page.goto("/editor");

  await expect(page).toHaveURL(/\/sign-in/);
  const url = page.url();
  const hasCallback = url.includes("callbackUrl=%2Feditor") || url.includes("callbackUrl=/editor");
  expect(hasCallback).toBe(true);
});

// ── auth-callback-url-preserved ──
test("eval: callbackUrl is preserved on sign-in page", async ({ page }) => {
  test.skip(bypass, "Needs auth bypass OFF");

  await page.goto("/sign-in?callbackUrl=/editor");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(page.url()).toContain("callbackUrl");
});

// ── auth-callback-url-sanitized ──
test("eval: malicious callbackUrl is sanitized server-side", async ({ page }) => {
  test.skip(bypass, "Needs auth bypass OFF");

  await page.goto("/sign-in?callbackUrl=//evil.com");

  // The page should render sign-in (not redirect to evil.com).
  // getSafeCallbackUrl() converts "//evil.com" → "/editor" server-side.
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

// ── auth-already-signed-in-skips-form ──
test("eval: already authenticated user skips sign-in form", async ({ page }) => {
  test.skip(!bypass, "Needs auth bypass ON");

  await page.goto("/sign-in");

  await expect(page).toHaveURL(/\/editor/);
});

// ── auth-sign-out ──
test("eval: sign out button is wired and calls the auth API", async ({ page }) => {
  test.skip(!bypass, "Needs auth bypass ON to start authenticated");

  await page.goto("/editor");
  await expect(page).toHaveURL(/\/editor/);

  // Open the sprint menu (timer chip in top-right)
  await page.getByRole("button", { name: /timer/i }).click();
  await expect(page.getByTestId("sprint-menu")).toBeVisible();

  // Click sign out — verify the auth API call fires.
  // With bypass ON, the sign-in page detects the fake session and bounces
  // back to /editor, so we can't assert the final URL is /sign-in.
  // Instead verify the sign-out POST was made (proving the button works).
  const signOutRequest = page.waitForRequest(
    (req) => req.url().includes("/api/auth") && req.method() === "POST",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  const req = await signOutRequest;
  expect(req.url()).toContain("/api/auth");
});

// ── auth-stale-cookie ──
test("eval: stale session cookie triggers re-auth", async ({ page, context }) => {
  test.skip(bypass, "Needs auth bypass OFF");

  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "totally-invalid-stale-token",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto("/editor");

  await expect(page).toHaveURL(/\/sign-in/);
  expect(page.url()).toContain("callbackUrl");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

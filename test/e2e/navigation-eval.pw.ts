/**
 * Navigation eval runner — exercises every workflow from eval/navigation.json.
 *
 *   E2E_BYPASS_AUTH=true bunx playwright test test/e2e/navigation-eval.pw.ts
 */
import { expect, test } from "@playwright/test";

// ── nav-404-page ──
test("eval: unknown route shows 404 page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");

  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByText("doesn't exist")).toBeVisible();

  const homeLink = page.getByRole("link", { name: /back to home/i });
  await expect(homeLink).toBeVisible();

  await homeLink.click();
  // Root redirects based on auth state — with bypass, lands on /editor
  await expect(page).toHaveURL(/\/(editor|sign-in)/);
});

// ── nav-health-endpoint ──
test("eval: health endpoint responds with status shape", async ({ request }) => {
  const response = await request.get("/api/health");

  // 200 when DB is connected, 503 when not (e.g. no DATABASE_URL in test env)
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(["ok", "error"]).toContain(body.status);
  expect(typeof body.db.latencyMs).toBe("number");
});

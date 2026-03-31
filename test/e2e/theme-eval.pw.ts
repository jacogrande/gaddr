/**
 * Theme eval runner — exercises every workflow from eval/theme.json.
 *
 *   E2E_BYPASS_AUTH=true bunx playwright test test/e2e/theme-eval.pw.ts
 */
import { expect, test } from "@playwright/test";

// ── theme-toggle ──
test("eval: toggle between light and dark themes", async ({ page }) => {
  await page.goto("/editor");

  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");

  // Click the theme toggle (sun/moon button in bottom-right)
  await page.getByRole("button", { name: /toggle|theme|light|dark/i }).click();

  const after = await html.getAttribute("data-theme");
  expect(after).not.toBe(before);
  expect(["light", "dark"]).toContain(after);
});

// ── theme-persists-reload ──
test("eval: theme preference persists across reload", async ({ page }) => {
  await page.goto("/editor");

  // Set to dark
  const html = page.locator("html");
  const current = await html.getAttribute("data-theme");
  if (current !== "dark") {
    await page.getByRole("button", { name: /toggle|theme|light|dark/i }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  }

  // Verify localStorage
  const stored = await page.evaluate(() => localStorage.getItem("gaddr:theme"));
  expect(stored).toBe("dark");

  // Reload and verify
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

// ── theme-system-preference-fallback ──
test("eval: system preference used when no stored preference", async ({ page }) => {
  // Emulate dark color scheme
  await page.emulateMedia({ colorScheme: "dark" });

  // Clear stored preference
  await page.goto("/editor");
  await page.evaluate(() => localStorage.removeItem("gaddr:theme"));
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

// ── theme-no-flash ──
test("eval: no flash of wrong theme on load", async ({ page }) => {
  // Set dark preference before navigating
  await page.goto("/editor");
  await page.evaluate(() => localStorage.setItem("gaddr:theme", "dark"));

  // Reload and check theme is set before any visible paint.
  // The inline theme script in <head> sets data-theme synchronously,
  // so by the time Playwright's reload resolves, it's already correct.
  await page.reload();
  const theme = await page.locator("html").getAttribute("data-theme");
  expect(theme).toBe("dark");

  // Also verify background color matches dark theme (not a white flash)
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor,
  );
  // Dark theme bg is #1d150f → rgb(29, 21, 15) — definitely not white
  expect(bg).not.toBe("rgb(255, 255, 255)");
});

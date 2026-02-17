import { test, expect } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility audits using axe-core.
 * Only flags critical and serious impact violations.
 */
test.describe("Accessibility", () => {
  test("dashboard has no critical accessibility violations", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toEqual([]);
  });

  test("editor has no critical accessibility violations", async ({ page }) => {
    // Create a fresh essay to test the editor
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    await expect(page.getByText("Draft")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toEqual([]);
  });

  test("sign-in page has no critical accessibility violations", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/sign-in");
    await expect(page.getByText("Microblogger")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toEqual([]);

    await context.close();
  });

  test("library has no critical accessibility violations", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByText("Evidence Library")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious).toEqual([]);
  });
});

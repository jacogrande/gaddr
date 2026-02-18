import { test, expect } from "playwright/test";

test.describe.serial("Revision History", () => {
  let essayId: string;

  test("publish initial version", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    essayId = page.url().split("/editor/")[1] ?? "";

    await page.getByPlaceholder("Untitled essay").fill("Revision Test Essay");

    const editor = page.locator(".tiptap");
    await editor.click();
    await editor.pressSequentially(
      "This is the first version of my essay. It contains enough content to be published.",
      { delay: 5 },
    );

    await expect(page.getByText("0 words")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 8_000 });

    const publishButton = page.getByRole("button", { name: "Publish" });
    await expect(publishButton).toBeEnabled({ timeout: 15000 });
    await publishButton.click();

    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test("edit and republish creates new version", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // Unpublish first to edit
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Draft")).toBeVisible({ timeout: 5_000 });

    // Edit content
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.press("End");
    await editor.pressSequentially(
      " Adding more content for the second version of this essay.",
      { delay: 5 },
    );

    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 8_000 });

    // Republish
    const publishButton = page.getByRole("button", { name: "Publish" });
    await expect(publishButton).toBeEnabled({ timeout: 15000 });
    await publishButton.click();

    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test("version history panel shows both versions", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // History button should be visible (we have versions)
    const historyButton = page.getByRole("button", { name: "History" });
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    // Version history panel should show
    await expect(page.getByText("Version History")).toBeVisible({ timeout: 5_000 });

    // Should show at least Version 1 and Version 2
    await expect(page.getByText("Version 1")).toBeVisible();
    await expect(page.getByText("Version 2")).toBeVisible();
  });

  test("public page shows Revised badge", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/essay/${essayId}`);

    // Title should be visible
    await expect(page.locator("h1")).toContainText("Revision Test Essay");

    // Should show "Revised" indicator (revisionCount >= 2)
    await expect(page.getByText(/Revised/)).toBeVisible();
  });
});

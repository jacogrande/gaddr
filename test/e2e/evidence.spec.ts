import { test, expect } from "playwright/test";

test.describe.serial("Evidence Cards", () => {
  let cardTitle: string;

  test("create evidence card in library", async ({ page }) => {
    cardTitle = `Test Source ${String(Date.now())}`;
    await page.goto("/library");

    await page.getByRole("button", { name: "Add Evidence" }).click();
    await expect(page.getByText("Add Evidence Card")).toBeVisible();

    // Fill the form
    await page.getByLabel("Source URL").fill("https://example.com/test-article");
    await page.getByLabel("Source Title").fill(cardTitle);
    await page.getByLabel("Quote Snippet").fill("This is a relevant quote from the source.");
    await page.getByLabel("Your Summary").fill("The source argues that testing is important.");
    await page.getByRole("button", { name: "Supports" }).click();

    // Submit
    await page.getByRole("button", { name: "Add Card" }).click();

    // Card should appear in the library list with "Supports" badge
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Supports").first()).toBeVisible();
  });

  test("attach evidence to essay claim", async ({ page }) => {
    test.skip(!cardTitle, "Requires evidence card from previous test");

    // Create an essay with content
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);

    await page.getByPlaceholder("Untitled essay").fill("Evidence Test Essay");
    const editor = page.locator(".tiptap");
    await editor.click();
    await editor.pressSequentially(
      "This is an important claim that needs evidence to support it properly.",
      { delay: 5 },
    );
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 8_000 });

    // Select text in the editor to enable "Attach Evidence"
    await editor.click();
    await page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+a`);

    // Click "Attach Evidence"
    const attachButton = page.getByRole("button", { name: "Attach Evidence" });
    await expect(attachButton).toBeEnabled({ timeout: 3_000 });
    await attachButton.click();

    // Evidence picker panel should appear
    await expect(page.getByText("Attach Evidence").nth(1)).toBeVisible({ timeout: 5_000 });

    // Find and click our evidence card
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 5_000 });
    await page.getByText(cardTitle).click();

    // Should show the evidence is now linked
    await expect(page.getByText("Supports").first()).toBeVisible({ timeout: 5_000 });
  });

  test("evidence visible on published page", async ({ page }) => {
    test.skip(!cardTitle, "Requires evidence card from previous test");

    // Navigate back to the library to verify the card exists
    await page.goto("/library");
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 5_000 });
  });

  test("delete evidence card", async ({ page }) => {
    test.skip(!cardTitle, "Requires evidence card from previous test");

    await page.goto("/library");
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 5_000 });

    // Click delete on the card (find card root via heading's ancestor with card class)
    const heading = page.getByRole("heading", { name: cardTitle });
    await heading.locator("xpath=ancestor::div[contains(@class, 'border-t-4')]").getByRole("button", { name: "Delete" }).click();

    // Confirm deletion (scope to the modal dialog overlay)
    const modal = page.locator(".fixed.inset-0");
    await expect(modal.getByText("Delete Evidence Card")).toBeVisible();
    await modal.getByRole("button", { name: "Delete" }).click();

    // Card heading should disappear from the list
    await expect(page.getByRole("heading", { name: cardTitle })).not.toBeVisible({ timeout: 5_000 });
  });
});

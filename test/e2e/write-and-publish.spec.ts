import { test, expect } from "playwright/test";

test.describe("Write and Publish flow", () => {
  let essayId: string;

  test("create a new draft from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();

    // Should redirect to /editor/{uuid}
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    const url = page.url();
    const parsed = url.split("/editor/")[1] ?? "";
    essayId = parsed;
    expect(essayId).toBeTruthy();

    // Editor should show draft status
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("0 words")).toBeVisible();
  });

  test("type content and verify autosave", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Type a title
    const titleInput = page.getByPlaceholder("Untitled essay");
    await titleInput.fill("My Test Essay");

    // Type content in the TipTap editor
    const editor = page.locator(".tiptap");
    await editor.click();
    await editor.pressSequentially(
      "This is a test essay with enough words to enable the publish button. It needs some real content to pass the empty content check.",
      { delay: 10 },
    );

    // Wait for autosave
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });

    // Word count should be non-zero
    await expect(page.getByText("0 words")).not.toBeVisible();
  });

  test("publish button is disabled when content is empty", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);

    // Publish button should be disabled (no content)
    const publishButton = page.getByRole("button", { name: "Publish" });
    await expect(publishButton).toBeDisabled();
  });

  test("publish essay and verify read-only mode", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Wait for editor to load with content
    await expect(page.getByText("Draft")).toBeVisible();

    // Click publish
    const publishButton = page.getByRole("button", { name: "Publish" });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();

    // Wait for status to change
    await expect(page.getByText("Published")).toBeVisible({ timeout: 5000 });

    // Toolbar should be hidden (read-only mode)
    await expect(page.locator(".mb-6.flex.flex-wrap.gap-2")).not.toBeVisible();

    // "View public page" link should appear
    await expect(page.getByText("View public page")).toBeVisible();

    // Title input should be disabled
    const titleInput = page.getByPlaceholder("Untitled essay");
    await expect(titleInput).toBeDisabled();
  });

  test("view published essay on public page", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/essay/${essayId}`);

    // Title should be rendered
    await expect(page.locator("h1")).toContainText("My Test Essay");

    // Content should be rendered in .tiptap container
    const content = page.locator(".tiptap");
    await expect(content).toBeVisible();
    await expect(content).toContainText("test essay");

    // Word count and published date should be visible
    await expect(page.getByText("words")).toBeVisible();

    // Microblogger nav link should be present
    await expect(page.getByRole("link", { name: "Microblogger" })).toBeVisible();
  });

  test("unpublish essay and verify draft mode restored", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Should be published
    await expect(page.getByText("Published")).toBeVisible();

    // Click unpublish
    await page.getByRole("button", { name: "Unpublish" }).click();

    // Wait for status to change back to draft
    await expect(page.getByText("Draft")).toBeVisible({ timeout: 5000 });

    // Toolbar should reappear
    await expect(page.getByRole("button", { name: "B" })).toBeVisible();

    // Title input should be enabled
    const titleInput = page.getByPlaceholder("Untitled essay");
    await expect(titleInput).toBeEnabled();
  });

  test("public page returns 404 after unpublish", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");

    // Public page should show not-found
    const response = await page.goto(`/essay/${essayId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Essay not found")).toBeVisible();
    await expect(page.getByText("has been unpublished")).toBeVisible();
  });

  test("invalid essay ID returns 404", async ({ page }) => {
    const response = await page.goto("/essay/not-a-valid-uuid");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Essay not found")).toBeVisible();
  });

  test("draft essay ID returns 404 on public page", async ({ page }) => {
    // Create a fresh draft (not published)
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    const draftId = page.url().split("/editor/")[1] ?? "";

    // Try to view it publicly
    const response = await page.goto(`/essay/${draftId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Essay not found")).toBeVisible();
  });
});

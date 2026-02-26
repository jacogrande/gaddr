import { expect, test } from "@playwright/test";

const authBypassDisabled = process.env.E2E_BYPASS_AUTH !== "true";

test.describe("editor workflow", () => {
  test.skip(authBypassDisabled, "Set E2E_BYPASS_AUTH=true to run editor workflow tests.");

  test("command palette inserts heading and blockquote content at the cursor", async ({ page }, testInfo) => {
    await page.goto("/editor");

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();
    await expect(page.getByText("Copyright Gaddr 2026")).toBeVisible();

    await editor.click();
    await page.keyboard.type("Intro text");

    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Editor command palette")).toBeVisible();
    await page.getByTestId("command-palette-input").fill("heading 1");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Editor command palette")).toBeHidden();

    await page.keyboard.type(" Main Heading");
    await expect(page.locator(".tiptap h1").last()).toContainText("Main Heading");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Editor command palette")).toBeVisible();
    await page.keyboard.press("Control+b");
    await expect(page.getByLabel("Editor command palette")).toBeHidden();

    await page.keyboard.press("Control+k");
    await expect(page.getByLabel("Editor command palette")).toBeVisible();
    await page.getByTestId("command-palette-input").fill("blockquote");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Editor command palette")).toBeHidden();

    await page.keyboard.type("Quoted inside blockquote");
    await expect(page.locator(".tiptap blockquote").last()).toContainText("Quoted inside blockquote");

    const screenshotPath = testInfo.outputPath("editor-workflow.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("editor-workflow", {
      path: screenshotPath,
      contentType: "image/png",
    });
  });
});

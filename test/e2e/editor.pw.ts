import { expect, test } from "@playwright/test";

const authBypassDisabled = process.env.E2E_BYPASS_AUTH !== "true";

test.describe("editor workflow", () => {
  test.skip(authBypassDisabled, "Set E2E_BYPASS_AUTH=true to run editor workflow tests.");

  test("slash menu and command palette insert block content at the cursor", async ({ page }, testInfo) => {
    await page.goto("/editor");

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();
    await expect(page.getByText("Copyright Gaddr 2026")).toBeVisible();

    await editor.click();
    await page.keyboard.type("Intro text");
    await page.keyboard.press("Enter");

    await page.keyboard.type("/hea");
    await expect(page.getByTestId("slash-menu")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("slash-menu")).toBeHidden();

    await page.keyboard.type("Slash Heading");
    await expect(page.locator(".tiptap h1").last()).toContainText("Slash Heading");
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

    await editor.click();
    await page.keyboard.type("Quoted inside blockquote");
    await expect(page.locator(".tiptap")).toContainText("Quoted inside blockquote");

    await page.keyboard.type(" This should trigger gadfly analysis.");
    await page.waitForTimeout(900);

    await page.keyboard.press("Control+Shift+D");
    const debugPane = page.getByTestId("gadfly-debug-pane");
    await expect(debugPane).toBeVisible();
    await expect(debugPane).toContainText("GADFLY DEBUG");
    await expect(debugPane).toContainText("Request JSON");

    const screenshotPath = testInfo.outputPath("editor-workflow.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("editor-workflow", {
      path: screenshotPath,
      contentType: "image/png",
    });
  });
});

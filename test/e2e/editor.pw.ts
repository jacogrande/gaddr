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

  test("constellation opens into atlas overview and can be reopened from the sprint area", async ({ page }) => {
    await page.goto("/editor");

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type(
      "I think remote work makes teams stronger because it widens talent access, but I need to pressure test the argument.",
    );

    await page.getByTestId("sprint-chip").hover();
    const sprintMenu = page.getByTestId("sprint-menu");
    await expect(sprintMenu).toBeVisible();
    await sprintMenu.getByRole("button", { name: /5 sec/i }).click();

    const constellationBoard = page.getByTestId("constellation-board");
    await expect(constellationBoard).toBeVisible({ timeout: 12000 });
    await expect(page.getByTestId("constellation-seed-node")).toBeVisible();

    const firstTheme = page.locator("[data-testid^='constellation-theme-']").first();
    await expect(firstTheme).toBeVisible();
    await firstTheme.click();

    const constellationPanel = page.getByTestId("constellation-panel");
    await expect(constellationPanel).toBeVisible();
    await expect(constellationPanel).toContainText("Why this surfaced");
    await expect(constellationPanel).toContainText("Suggested next actions");

    await page.getByTestId("constellation-close-button").click();
    await expect(constellationBoard).toBeHidden({ timeout: 4000 });
    await expect(page.getByTestId("constellation-reopen-button")).toBeVisible();

    await page.getByTestId("constellation-reopen-button").click();
    await expect(constellationBoard).toBeVisible({ timeout: 5000 });
  });
});

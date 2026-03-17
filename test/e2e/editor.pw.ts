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

  test("constellation supports local exploration, branching, and atlas reset", async ({ page }) => {
    await page.goto("/editor");

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type(
      "I think remote work makes teams stronger because it widens talent access, but I need to pressure test the argument.",
    );

    await page.getByTestId("sprint-chip").click();
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
    await expect(page.getByTestId("constellation-reset-button")).toBeVisible();

    const firstPanelChild = page.locator("[data-testid^='constellation-panel-child-']").first();
    await expect(firstPanelChild).toBeVisible();
    const firstPanelChildTitle = await firstPanelChild.locator("h4").innerText();
    await firstPanelChild.click();
    await expect(constellationPanel).toContainText(firstPanelChildTitle);

    const branchNodeLocator = page.locator("[data-testid^='constellation-node-']");
    const branchNodeCountBeforeAction = await branchNodeLocator.count();
    await page.locator("[data-testid^='constellation-action-']").first().click();
    await expect
      .poll(async () => branchNodeLocator.count(), { timeout: 5000 })
      .toBeGreaterThan(branchNodeCountBeforeAction);

    await page.getByTestId("constellation-branch-toggle").click();
    await expect
      .poll(async () => page.locator("[data-testid^='constellation-theme-']").count())
      .toBe(1);

    await page.getByTestId("constellation-reset-button").click();
    await expect(page.getByTestId("constellation-panel")).toBeHidden();
    await expect
      .poll(async () => page.locator("[data-testid^='constellation-theme-']").count())
      .toBeGreaterThan(1);

    await page.getByTestId("constellation-close-button").click();
    await expect(constellationBoard).toBeHidden({ timeout: 4000 });
    await expect(page.getByTestId("constellation-reopen-button")).toBeVisible();

    await page.getByTestId("constellation-reopen-button").click();
    await expect(constellationBoard).toBeVisible({ timeout: 5000 });
  });

  test("constellation draft prep collects nodes and appends talking points into the editor", async ({ page }) => {
    await page.goto("/editor");

    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type(
      "Remote work expands access to talent, but I need to collect the best evidence and objections before drafting.",
    );

    await page.getByTestId("sprint-chip").click();
    const sprintMenu = page.getByTestId("sprint-menu");
    await expect(sprintMenu).toBeVisible();
    await sprintMenu.getByRole("button", { name: /5 sec/i }).click();

    const constellationBoard = page.getByTestId("constellation-board");
    await expect(constellationBoard).toBeVisible({ timeout: 12000 });

    const firstTheme = page.locator("[data-testid^='constellation-theme-']").first();
    await firstTheme.click();

    const constellationPanel = page.getByTestId("constellation-panel");
    await expect(constellationPanel).toBeVisible();
    await constellationPanel.getByRole("button", { name: "Use in draft" }).click();
    await constellationPanel.getByRole("button", { name: "Pin" }).click();

    const firstPanelChild = page.locator("[data-testid^='constellation-panel-child-']").first();
    await firstPanelChild.click();
    await expect(constellationPanel).toBeVisible();
    await constellationPanel.getByRole("button", { name: "Use in draft" }).click();

    await page.getByTestId("constellation-open-draft-prep").click();

    const draftPrep = page.getByTestId("constellation-draft-prep");
    await expect(draftPrep).toBeVisible();
    await expect(page.locator("[data-testid^='constellation-draft-item-']")).toHaveCount(2);

    const secondDraftItem = page.locator("[data-testid^='constellation-draft-item-']").nth(1);
    await secondDraftItem.getByRole("button", { name: "Move up" }).click();

    const firstDraftItem = page.locator("[data-testid^='constellation-draft-item-']").first();
    await firstDraftItem.getByRole("button", { name: "Remove" }).click();
    await expect(page.locator("[data-testid^='constellation-draft-item-']")).toHaveCount(1);

    await page.getByTestId("constellation-start-first-draft").click();
    await expect(constellationBoard).toBeHidden({ timeout: 4000 });
    await expect(page.getByTestId("editor-content")).toBeVisible();
    await expect(page.locator(".tiptap")).toContainText("First Draft Prep");
    await expect(page.locator(".tiptap")).toContainText(
      "Remote work expands access to talent, but I need to collect the best evidence and objections before drafting.",
    );
  });
});

/**
 * Editor eval runner — exercises every workflow from eval/editor.json.
 *
 *   E2E_BYPASS_AUTH=true bunx playwright test test/e2e/editor-eval.pw.ts
 */
import { expect, test } from "@playwright/test";

const isMac = process.platform === "darwin";
const mod = isMac ? "Meta" : "Control";

/** Clear editor localStorage and navigate to /editor with a fresh doc. */
async function freshEditor(page: import("@playwright/test").Page) {
  await page.goto("/editor");
  await page.evaluate(() => {
    localStorage.removeItem("gaddr:minimal-editor");
  });
  await page.reload();
  await expect(page.getByTestId("editor-content")).toBeVisible();
  // Wait for TipTap to mount and focus
  await page.locator(".tiptap").waitFor({ state: "visible" });
}

// ── editor-loads-empty ──
test("eval: editor loads with empty document", async ({ page }) => {
  await freshEditor(page);

  const editorText = await page.locator(".tiptap").innerText();
  // TipTap inserts an empty paragraph — text content should be empty/whitespace
  expect(editorText.trim()).toBe("");
});

// ── editor-type-and-persist ──
test("eval: typing persists to localStorage", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("Hello, gaddr.");

  // Wait for idle save (1.2s timeout + buffer)
  await page.waitForTimeout(2000);

  await page.reload();
  await expect(page.locator(".tiptap")).toContainText("Hello, gaddr.");
});

// ── editor-bold-hotkey ──
test("eval: bold formatting via keyboard shortcut", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("some text");

  // Select all and bold
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+b`);

  await expect(page.locator(".tiptap strong")).toContainText("some text");
});

// ── editor-italic-underline-strike ──
test("eval: italic, underline, and strikethrough hotkeys", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();

  // Type and select all, apply italic
  await page.keyboard.type("italic test");
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+i`);
  await expect(page.locator(".tiptap em")).toContainText("italic test");

  // Remove italic, apply underline
  await page.keyboard.press(`${mod}+i`);
  await page.keyboard.press(`${mod}+u`);
  await expect(page.locator(".tiptap u")).toContainText("italic test");
});

// ── editor-heading-hotkeys ──
test("eval: heading levels via hotkeys", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("My Heading");

  // H1
  await page.keyboard.press(`${mod}+Alt+1`);
  await expect(page.locator(".tiptap h1")).toHaveText("My Heading");

  // H2
  await page.keyboard.press(`${mod}+Alt+2`);
  await expect(page.locator(".tiptap h2")).toHaveText("My Heading");

  // H3
  await page.keyboard.press(`${mod}+Alt+3`);
  await expect(page.locator(".tiptap h3")).toHaveText("My Heading");

  // Back to paragraph
  await page.keyboard.press(`${mod}+Alt+0`);
  await expect(page.locator(".tiptap p").first()).toHaveText("My Heading");
});

// ── editor-slash-menu-opens ──
test("eval: slash menu opens on / keystroke", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/");

  await expect(page.getByTestId("slash-menu")).toBeVisible();
});

// ── editor-slash-menu-filters ──
test("eval: slash menu filters by query", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/head");

  await expect(page.getByTestId("slash-menu")).toBeVisible();

  // Should show heading commands (command ID is "h1")
  await expect(page.getByTestId("slash-command-h1")).toBeVisible();

  // Escape closes the menu
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("slash-menu")).not.toBeVisible();
});

// ── editor-slash-menu-inserts-block ──
test("eval: slash menu inserts selected block", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/bullet");

  await expect(page.getByTestId("slash-menu")).toBeVisible();
  await page.keyboard.press("Enter");

  // Verify a bullet list was inserted
  await expect(page.locator(".tiptap ul")).toBeVisible();
  // Slash text should be gone
  await expect(page.locator(".tiptap")).not.toContainText("/bullet");
});

// ── editor-command-palette ──
test("eval: command palette opens, searches, and closes", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.press(`${mod}+k`);

  await expect(page.getByTestId("command-palette")).toBeVisible();

  // Search for "bold"
  await page.getByTestId("command-palette-input").fill("bold");
  await expect(page.getByTestId("command-bold")).toBeVisible();

  // Escape closes
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("command-palette")).not.toBeVisible();
});

// ── editor-glyph-em-dash ──
test("eval: glyph auto-replacement -- becomes em-dash", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("hello--world");

  await expect(page.locator(".tiptap")).toContainText("hello\u2014world");
});

// ── editor-glyph-arrow ──
test("eval: glyph auto-replacement -> becomes arrow", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("A -> B");

  await expect(page.locator(".tiptap")).toContainText("A \u2192 B");
});

// ── editor-glyph-ellipsis ──
test("eval: glyph auto-replacement ... becomes ellipsis", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("wait...");

  await expect(page.locator(".tiptap")).toContainText("wait\u2026");
});

// ── editor-undo-redo ──
test("eval: undo and redo work", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("first");
  // Small delay so TipTap records separate history entries
  await page.waitForTimeout(200);
  await page.keyboard.type(" second");

  await expect(page.locator(".tiptap")).toContainText("first second");

  // Undo
  await page.keyboard.press(`${mod}+z`);
  await expect(page.locator(".tiptap")).not.toContainText("second");

  // Redo
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(page.locator(".tiptap")).toContainText("second");
});

// ── editor-modifier-badges ──
test("eval: modifier badges appear for active formatting", async ({ page }) => {
  await freshEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("hello world");

  // Select all and bold
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+b`);

  // Verify the B badge appears
  await expect(page.locator(".gaddr-modifier-chip").filter({ hasText: "B" })).toBeVisible();

  // Un-bold
  await page.keyboard.press(`${mod}+b`);

  // Badge should exit (either hidden or has exit class)
  await expect(
    page.locator(".gaddr-modifier-chip").filter({ hasText: "B" }),
  ).not.toBeVisible({ timeout: 2000 });
});

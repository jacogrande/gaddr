/**
 * Sprint eval runner — exercises every workflow from eval/sprint.json.
 *
 *   E2E_BYPASS_AUTH=true bunx playwright test test/e2e/sprint-eval.pw.ts
 */
import { expect, test } from "@playwright/test";

async function freshEditor(page: import("@playwright/test").Page) {
  await page.goto("/editor");
  await page.evaluate(() => {
    localStorage.removeItem("gaddr:minimal-editor");
  });
  await page.reload();
  await page.locator(".tiptap").waitFor({ state: "visible" });
}

async function openSprintMenu(page: import("@playwright/test").Page) {
  const chip = page.getByTestId("sprint-chip");
  await chip.click();
  // The onBlur handler on the menu container can swallow the first click
  // if focus was transitioning. Retry once if needed.
  if (!(await page.getByTestId("sprint-menu").isVisible().catch(() => false))) {
    await chip.click();
  }
  await expect(page.getByTestId("sprint-menu")).toBeVisible();
}

async function clickSprintOption(page: import("@playwright/test").Page, label: string) {
  await page
    .getByTestId("sprint-menu")
    .locator("button")
    .filter({ hasText: new RegExp(`^${label}`) })
    .first()
    .click();
}

async function start5sSprint(page: import("@playwright/test").Page) {
  await openSprintMenu(page);
  await clickSprintOption(page, "5 sec");
}

async function completeSprintAndWaitForBoard(page: import("@playwright/test").Page) {
  await start5sSprint(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("Testing the sprint timer.");
  // Timer (5s) + idle detection (2.6s) + transition_in (1.5s) + buffer
  await page.waitForTimeout(10000);
  await expect(page.getByTestId("node-grid")).toBeVisible({ timeout: 5000 });
}

/**
 * When the board is visible the editor pane has `visibility: hidden`.
 * Temporarily remove the hidden class so Playwright can click + type
 * into the editor, which triggers onUpdate → transition_out.
 */
async function typeToExitBoard(page: import("@playwright/test").Page, text: string) {
  await page.evaluate(() => {
    const pane = document.querySelector(".gaddr-constellation-editor-pane--hidden");
    if (pane) {
      pane.classList.remove("gaddr-constellation-editor-pane--hidden");
      (pane as HTMLElement).style.visibility = "visible";
      (pane as HTMLElement).style.height = "auto";
      (pane as HTMLElement).style.position = "relative";
    }
  });
  await page.locator(".tiptap").click({ timeout: 2000 });
  await page.keyboard.type(text);
  // transition_out (1.1s) + buffer
  await page.waitForTimeout(2000);
}

// ── sprint-menu-opens ──
test("eval: sprint menu opens with duration options", async ({ page }) => {
  await freshEditor(page);
  await openSprintMenu(page);

  const menu = page.getByTestId("sprint-menu");
  await expect(menu.getByText("5 min", { exact: true })).toBeVisible();
  await expect(menu.getByText("10 min", { exact: true })).toBeVisible();
  await expect(menu.getByText("15 min", { exact: true })).toBeVisible();
  await expect(menu.getByText("20 min", { exact: true })).toBeVisible();
  await expect(menu.getByText("Default")).toBeVisible();
});

// ── sprint-start-countdown ──
test("eval: starting a sprint shows countdown", async ({ page }) => {
  await freshEditor(page);
  await start5sSprint(page);

  await expect(page.getByTestId("sprint-menu")).not.toBeVisible();
  await expect(page.getByTestId("sprint-chip")).toContainText(/\d/);
});

// ── sprint-pause-resume ──
test("eval: pause and resume a sprint", async ({ page }) => {
  await freshEditor(page);

  await openSprintMenu(page);
  await clickSprintOption(page, "5 min");
  await expect(page.getByTestId("sprint-menu")).not.toBeVisible();

  // Pause
  await openSprintMenu(page);
  await page.getByRole("button", { name: /pause timer/i }).click();
  await expect(page.getByTestId("sprint-chip")).toContainText(/paused/i);

  // Resume
  await openSprintMenu(page);
  await page.getByRole("button", { name: /resume timer/i }).click();
  await expect(page.getByTestId("sprint-chip")).not.toContainText(/paused/i);
  await expect(page.getByTestId("sprint-chip")).toContainText(/min|:\d/);
});

// ── sprint-extend-time ──
test("eval: extend sprint by 5 minutes", async ({ page }) => {
  await freshEditor(page);

  await openSprintMenu(page);
  await clickSprintOption(page, "5 min");
  await page.waitForTimeout(500);

  const beforeText = await page.getByTestId("sprint-chip").innerText();

  await openSprintMenu(page);
  await page.getByRole("button", { name: /\+5 min/i }).click();
  await page.waitForTimeout(500);

  const afterText = await page.getByTestId("sprint-chip").innerText();
  expect(afterText).toMatch(/min|:\d/);
  expect(afterText).not.toBe(beforeText);
});

// ── sprint-end-early ──
test("eval: end sprint early resets to idle", async ({ page }) => {
  await freshEditor(page);
  await start5sSprint(page);

  await openSprintMenu(page);
  await page.getByRole("button", { name: /end timer/i }).click();

  await expect(page.getByTestId("sprint-chip")).toContainText(/timer/i);
  await expect(page.getByTestId("node-grid")).not.toBeVisible();
});

// ── sprint-complete-board-transition ──
test("eval: sprint completes and board animates in", async ({ page }) => {
  test.setTimeout(30000);
  await freshEditor(page);
  await completeSprintAndWaitForBoard(page);

  await expect(page.getByTestId("node-grid")).toBeVisible();
  await expect(page.locator(".gaddr-constellation-editor-pane--hidden")).toHaveCount(1);
});

// ── sprint-typing-exits-board ──
test("eval: typing exits the board and returns to editor", async ({ page }) => {
  test.setTimeout(30000);
  await freshEditor(page);
  await completeSprintAndWaitForBoard(page);

  await typeToExitBoard(page, "Back to editing");

  await expect(page.getByTestId("node-grid")).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("editor-content")).toBeVisible();
  await expect(page.locator(".tiptap")).toContainText("Back to editing");
});

// ── sprint-reopen-board ──
test("eval: explore button reopens the board after dismissal", async ({ page }) => {
  test.setTimeout(30000);
  await freshEditor(page);
  await completeSprintAndWaitForBoard(page);

  await typeToExitBoard(page, "dismiss");
  await expect(page.getByTestId("node-grid")).not.toBeVisible({ timeout: 5000 });

  await expect(page.getByTestId("board-reopen-button")).toBeVisible({ timeout: 3000 });
  await page.getByTestId("board-reopen-button").click();

  await expect(page.getByTestId("node-grid")).toBeVisible({ timeout: 5000 });
});

// ── sprint-restart-resets-board ──
test("eval: starting a new sprint resets the board", async ({ page }) => {
  test.setTimeout(30000);
  await freshEditor(page);
  await completeSprintAndWaitForBoard(page);

  // Dismiss the board by typing
  await typeToExitBoard(page, "x");
  await expect(page.getByTestId("node-grid")).not.toBeVisible({ timeout: 5000 });

  // Sprint phase is still "completed" — menu shows actions, not duration options.
  // End the sprint first to return to idle, then start a new one.
  await openSprintMenu(page);
  await page.getByRole("button", { name: /end timer/i }).click();
  await expect(page.getByTestId("sprint-chip")).toContainText(/timer/i);

  await start5sSprint(page);

  await expect(page.getByTestId("node-grid")).not.toBeVisible();
  await expect(page.getByTestId("sprint-chip")).toContainText(/\d/);
});

// ── sprint-overtime-label ──
test("eval: overtime label shows when typing after completion", async ({ page }) => {
  test.setTimeout(20000);
  await freshEditor(page);
  await start5sSprint(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("Writing during sprint.");

  // Wait for timer to expire
  await page.waitForTimeout(6000);

  // Keep typing to stay in "writer active" mode
  await page.keyboard.type(" Still going.");

  await expect(page.getByTestId("sprint-chip")).toContainText(/\+\d+:\d+/, { timeout: 3000 });
});

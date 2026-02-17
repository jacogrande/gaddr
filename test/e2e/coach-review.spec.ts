import { test, expect } from "playwright/test";

/**
 * Coach review E2E tests.
 * Uses the fixture review adapter (E2E_TESTING=true) for deterministic feedback.
 */
test.describe.serial("Coach Review", () => {
  let essayId: string;

  test("create essay with 200+ words and request review", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    essayId = page.url().split("/editor/")[1] ?? "";

    // Fill title
    await page.getByPlaceholder("Untitled essay").fill("Review Test Essay");

    // Type 200+ words of content
    const editor = page.locator(".tiptap");
    await editor.click();
    const words = Array.from(
      { length: 45 },
      (_, i) => `Sentence number ${String(i + 1)} contains several words that fill the essay.`,
    ).join(" ");
    await editor.pressSequentially(words, { delay: 2 });

    // Wait for autosave
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

    // Click "Get Feedback"
    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled();
    await feedbackButton.click();

    // Feedback panel should appear with "Coach Feedback" header
    await expect(page.getByText("Coach Feedback")).toBeVisible({ timeout: 15_000 });
  });

  test("feedback panel shows inline comments and rubric scores", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Re-request feedback (or it may still be cached)
    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled({ timeout: 5_000 });
    await feedbackButton.click();

    // Wait for feedback panel
    await expect(page.getByText("Coach Feedback")).toBeVisible({ timeout: 15_000 });

    // Should show inline comments section (fixture has 2 inline comments)
    await expect(page.getByText("INLINE COMMENTS")).toBeVisible({ timeout: 10_000 });

    // Should show rubric section (fixture has 5 scores)
    await expect(page.getByText("RUBRIC")).toBeVisible({ timeout: 10_000 });

    // Verify at least one rubric dimension is scored
    await expect(page.getByText("Clarity")).toBeVisible();
    await expect(page.getByText("Evidence")).toBeVisible();
  });

  test("feedback contains no ghostwriting patterns", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled({ timeout: 5_000 });
    await feedbackButton.click();

    await expect(page.getByText("Coach Feedback")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("INLINE COMMENTS")).toBeVisible({ timeout: 10_000 });

    // Get all text from the feedback panel
    const panelText = await page.getByTestId("feedback-panel").textContent() ?? "";

    // No replacement prose patterns (authorship constraint)
    expect(panelText).not.toMatch(/Replace with:/i);
    expect(panelText).not.toMatch(/Change to:/i);
    expect(panelText).not.toMatch(/Rewrite as:/i);
  });
});

import { test, expect } from "playwright/test";

/**
 * Writing Coach E2E tests.
 * Uses the fixture assistant adapter (E2E_TESTING=true) for deterministic feedback.
 */
test.describe.serial("Writing Coach", () => {
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

    // Wait for autosave (exact match to avoid matching initial "Saved" before content changes)
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Click "Get Feedback"
    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled();
    await feedbackButton.click();

    // Assistant panel should appear with "Writing Coach" header
    await expect(page.getByText("Writing Coach")).toBeVisible({ timeout: 15_000 });
  });

  test("assistant panel shows inline comments and rubric scores", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Re-request feedback (or it may still be cached)
    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled({ timeout: 5_000 });
    await feedbackButton.click();

    // Wait for assistant panel
    await expect(page.getByText("Writing Coach")).toBeVisible({ timeout: 15_000 });

    // Should show inline comments section (fixture has 2 inline comments)
    await expect(page.getByText("INLINE COMMENTS")).toBeVisible({ timeout: 10_000 });

    // Should show rubric section (fixture has 5 scores)
    await expect(page.getByText("RUBRIC")).toBeVisible({ timeout: 10_000 });

    // Verify at least one rubric dimension is scored (scope to assistant panel)
    const panel = page.getByTestId("assistant-panel");
    await expect(panel.getByText("Clarity")).toBeVisible();
    await expect(panel.getByText(/Evidence/)).toBeVisible();
  });

  test("feedback contains no ghostwriting patterns", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    const feedbackButton = page.getByRole("button", { name: "Get Feedback" });
    await expect(feedbackButton).toBeEnabled({ timeout: 5_000 });
    await feedbackButton.click();

    await expect(page.getByText("Writing Coach")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("INLINE COMMENTS")).toBeVisible({ timeout: 10_000 });

    // Get all text from the assistant panel
    const panelText = await page.getByTestId("assistant-panel").textContent() ?? "";

    // No replacement prose patterns (authorship constraint)
    expect(panelText).not.toMatch(/Replace with:/i);
    expect(panelText).not.toMatch(/Change to:/i);
    expect(panelText).not.toMatch(/Rewrite as:/i);
  });

  test("chat flow: type question and get text response", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Open coach panel via Coach button
    const coachButton = page.getByRole("button", { name: "Coach" });
    await coachButton.click();

    await expect(page.getByText("Writing Coach")).toBeVisible({ timeout: 5_000 });

    // Type a question in the chat input
    const chatInput = page.getByPlaceholder("Ask about your essay...");
    await chatInput.fill("How can I improve my argument?");

    // Send the message
    const sendButton = page.getByRole("button", { name: "Send" });
    await sendButton.click();

    // Should see the user message displayed
    await expect(page.getByText("How can I improve my argument?")).toBeVisible({ timeout: 5_000 });

    // Should get a text response from the assistant (fixture returns coaching text)
    const panel = page.getByTestId("assistant-panel");
    await expect(panel.getByText(/strong central argument/)).toBeVisible({ timeout: 15_000 });
  });

  test("research flow: ask for sources and see suggestions", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);

    // Open coach panel
    const coachButton = page.getByRole("button", { name: "Coach" });
    await coachButton.click();

    await expect(page.getByText("Writing Coach")).toBeVisible({ timeout: 5_000 });

    // Ask for sources (keywords trigger research fixture)
    const chatInput = page.getByPlaceholder("Ask about your essay...");
    await chatInput.fill("Find sources about evidence-based writing");

    const sendButton = page.getByRole("button", { name: "Send" });
    await sendButton.click();

    // Should see source suggestions from the fixture
    const panel = page.getByTestId("assistant-panel");
    await expect(panel.getByText("SOURCES")).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByText("The Impact of Evidence-Based Writing on Critical Thinking")).toBeVisible();
    await expect(panel.getByText("supporting")).toBeVisible();
    await expect(panel.getByText("opposing")).toBeVisible();
  });
});

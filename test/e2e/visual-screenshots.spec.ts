import { test, expect } from "playwright/test";

const SCREENSHOT_DIR = "test/visual/screenshots";

/**
 * Visual screenshot suite — captures key pages at desktop and mobile viewports
 * for manual design review. Not assertion-heavy: the goal is producing screenshots.
 */
test.describe.serial("Visual Screenshots", () => {
  let essayId: string;

  // ── Sign-in page (unauthenticated) ──

  test("sign-in page", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/sign-in-desktop.png`,
      fullPage: true,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/sign-in-mobile.png`,
      fullPage: true,
    });
    await context.close();
  });

  // ── 404 page ──

  test("404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/404-desktop.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/404-mobile.png`,
      fullPage: true,
    });
  });

  // ── Dashboard (with essays) ──

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/dashboard-desktop.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/dashboard-mobile.png`,
      fullPage: true,
    });
  });

  // ── Editor: create a draft, capture draft mode, then publish ──

  test("editor - draft mode", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "New Essay" }).click();
    await page.waitForURL(/\/editor\/[0-9a-f-]+/);
    essayId = page.url().split("/editor/")[1] ?? "";

    // Type a title and content
    const titleInput = page.getByPlaceholder("Untitled essay");
    await titleInput.fill("The Art of Micro-Essays");

    const editor = page.locator(".tiptap");
    await editor.click();
    await editor.pressSequentially(
      "Writing in constraints sharpens thinking. A micro-essay forces you to distill ideas to their essence, cutting away excess to reveal what truly matters. Each word must earn its place. Evidence must be precise. Arguments must be tight. This practice of compression builds a mental discipline that transfers to all forms of communication and reasoning.",
      { delay: 5 },
    );

    // Wait for autosave to fully complete (exact match to avoid "Unsaved changes")
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 8000 });

    // Desktop screenshot: draft mode with toolbar, sprint timer area, word count
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/editor-draft-desktop.png`,
      fullPage: true,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/editor-draft-mobile.png`,
      fullPage: true,
    });

    // Reset viewport for next test
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ── Editor: publish and capture published mode ──

  test("editor - published mode", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");

    // Reload from server to confirm content was persisted
    await page.goto(`/editor/${essayId}`);
    await expect(page.getByText("Draft")).toBeVisible();

    // Wait for the publish button to become enabled (content + title loaded from DB)
    const publishButton = page.getByRole("button", { name: "Publish" });
    await expect(publishButton).toBeEnabled({ timeout: 15000 });

    // Publish
    await publishButton.click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 5000 });

    // Desktop screenshot: published mode with "View public page", "Copy link", version history
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/editor-published-desktop.png`,
      fullPage: true,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/editor-published-mobile.png`,
      fullPage: true,
    });

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ── Public essay page ──

  test("public essay page", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/essay/${essayId}`);
    await expect(page.locator("h1")).toContainText("The Art of Micro-Essays");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/public-essay-desktop.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/public-essay-mobile.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ── Essay not-found page ──

  test("essay not-found page", async ({ page }) => {
    await page.goto("/essay/00000000-0000-4000-8000-000000000000");
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/essay-not-found-desktop.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/essay-not-found-mobile.png`,
      fullPage: true,
    });

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ── Portfolio page ──

  test("portfolio page", async ({ page }) => {
    // Get the test user's ID from dashboard (we need it for the portfolio URL)
    // Use the health endpoint or just try accessing /u/ with a known pattern
    // The seeded user's ID varies, so let's get it from the session
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");

    // The sign-out button has the user name — extract it from the page
    // For the portfolio page, we need the user ID. Let's get it from the API.
    const response = await page.request.get("/api/auth/get-session");
    const session = await response.json();
    const userId = session?.user?.id;

    if (userId) {
      await page.goto(`/u/${userId}`);
      await page.waitForLoadState("networkidle");

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/portfolio-desktop.png`,
        fullPage: true,
      });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/portfolio-mobile.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  // ── Unpublish to restore draft (cleanup for other tests) ──

  test("cleanup: unpublish essay", async ({ page }) => {
    test.skip(!essayId, "Requires essay from previous test");
    await page.goto(`/editor/${essayId}`);
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Draft")).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Design kit screenshots — captures all kit demo pages.
 * These are static pages that don't require authentication.
 */
test.describe("Design Kit Screenshots", () => {
  const kits = [
    "warm-editorial",
    "ink-and-paper",
    "library-study",
    "soft-clay",
    "pressed-type",
    "morning-pages",
    "noir-terminal",
    "collage-board",
  ];

  for (const kit of kits) {
    test(`kit: ${kit}`, async ({ page }) => {
      const response = await page.goto(`/kit/${kit}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      // Kit pages should render (200 OK)
      if (response?.ok()) {
        await page.waitForTimeout(500); // Let fonts settle
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/kit-${kit}-desktop.png`,
          fullPage: true,
        });

        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/kit-${kit}-mobile.png`,
          fullPage: true,
        });
        await page.setViewportSize({ width: 1280, height: 720 });
      }
    });
  }

  test("kit: synthesized final", async ({ page }) => {
    const response = await page.goto("/kit", {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    if (response?.ok()) {
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/kit-final-desktop.png`,
        fullPage: true,
      });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/kit-final-mobile.png`,
        fullPage: true,
      });
    }
  });
});

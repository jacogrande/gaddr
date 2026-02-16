/**
 * Screenshot utility for design kit demo pages.
 *
 * Captures desktop and mobile screenshots of each kit page using Playwright.
 * Used by the /design-kit pipeline to provide visual input to the kit-judge.
 *
 * Usage:
 *   bun scripts/screenshot-kits.ts <kit-name> [kit-name...]
 *
 * Prerequisites:
 *   bun add -d @playwright/test
 *   bunx playwright install chromium
 *
 * Output:
 *   test/visual/kits/{kit-name}-desktop.png
 *   test/visual/kits/{kit-name}-mobile.png
 */

import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUTPUT_DIR = join(process.cwd(), "test/visual/kits");

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
] as const;

async function screenshotKits(kitNames: string[]) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const kit of kitNames) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
        });

        const url = `${BASE_URL}/kit/${kit}`;
        console.log(`Capturing ${kit} (${vp.name}) at ${url}`);

        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
          // Let fonts and images settle
          await page.waitForTimeout(1000);

          const outputPath = join(OUTPUT_DIR, `${kit}-${vp.name}.png`);
          await page.screenshot({ path: outputPath, fullPage: true });

          console.log(`  -> ${outputPath}`);
        } catch (err) {
          console.error(`  Failed to capture ${kit} (${vp.name}): ${err}`);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

const kitNames = process.argv.slice(2);

if (kitNames.length === 0) {
  console.error(
    "Usage: bun scripts/screenshot-kits.ts <kit-name> [kit-name...]",
  );
  console.error("Example: bun scripts/screenshot-kits.ts alpine editorial");
  process.exit(1);
}

await screenshotKits(kitNames);

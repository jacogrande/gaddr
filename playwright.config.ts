import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 8080);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: `${baseURL}/sign-in`,
        timeout: 120000,
        reuseExistingServer: false,
        env: {
          ...process.env,
          NODE_ENV: "test",
          E2E_TESTING: "true",
          E2E_BYPASS_AUTH: process.env.E2E_BYPASS_AUTH ?? "true",
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
        },
      },
});

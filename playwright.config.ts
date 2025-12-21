// path: playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const webServerURL = process.env.PLAYWRIGHT_WEB_SERVER_URL ?? 'http://127.0.0.1:4173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? webServerURL;

export default defineConfig({
  testDir: './e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'pnpm start -- --hostname 127.0.0.1 --port 4173',
    url: webServerURL,
    reuseExistingServer: !process.env.CI,
  },
});

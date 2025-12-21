import { defineConfig, devices } from '@playwright/test';

const defaultSessionModel = process.env.PLAYWRIGHT_SESSION_MODEL ?? 'lmstudio:local-default';
const defaultGeneralModel = process.env.PLAYWRIGHT_GENERAL_MODEL ?? 'lmstudio:local-default';
const baseOrigin = process.env.PLAYWRIGHT_BASE_ORIGIN ?? 'http://127.0.0.1:4173';
const basePath = process.env.PLAYWRIGHT_BASE_PATH ?? '';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `${baseOrigin}${basePath}`;
const startCommand = 'pnpm start -- --hostname 127.0.0.1 --port 4173';
const buildCommand = 'pnpm build';
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  (process.env.SKIP_BUILD ? startCommand : `${buildCommand} && ${startCommand}`);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
  expect: {
    timeout: 10_000,
  },
  timeout: 60_000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  webServer: {
    command: webServerCommand,
    url: baseOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '4173',
      AI_SESSION_DEFAULT_MODEL: defaultSessionModel,
      AI_GENERAL_DEFAULT_MODEL: defaultGeneralModel,
    },
  },
});

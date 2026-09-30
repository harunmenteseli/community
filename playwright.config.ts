import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4310);
const API_PORT = Number(process.env.E2E_API_PORT ?? 4311);
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

const apiEnv = {
  PORT: String(API_PORT),
  API_URL: `http://127.0.0.1:${API_PORT}`,
};

const webEnv = {
  VITE_API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @community/api dev',
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: apiEnv,
    },
    {
      command: `pnpm --filter @community/web dev --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: webEnv,
    },
  ],
});

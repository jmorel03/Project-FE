import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../backend run start',
      url: 'http://localhost:4000/health',
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- --host localhost --port 5173',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
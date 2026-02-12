import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['github'],
  ],

  use: {
    baseURL: process.env.API_URL || 'http://localhost:8080/api/v1',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  // No browser projects needed for API tests
  projects: [{ name: 'api' }],

  outputDir: 'test-results',
});

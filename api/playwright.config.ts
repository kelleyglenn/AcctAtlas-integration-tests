import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["github"],
    ["junit", { outputFile: "results.xml" }],
  ],

  use: {
    baseURL: process.env.API_URL || "http://localhost:8080/api/v1",
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },

  // User-service tests run first since other services depend on user authentication
  // Health checks run first to verify services are up, then user-service, then others
  projects: [
    {
      name: "health",
      testMatch: /health\.spec\.ts/,
    },
    {
      name: "user-service",
      testMatch: /user-service\.spec\.ts/,
      dependencies: ["health"],
    },
    {
      name: "other-services",
      testIgnore: [/health\.spec\.ts/, /user-service\.spec\.ts/],
      dependencies: ["user-service"],
    },
  ],

  outputDir: "test-results",
});

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["e2e/**/*.ts", "api/**/*.ts"],
    ...playwright.configs["flat/recommended"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/expect-expect": "error",
      "playwright/no-focused-test": "error",
      "playwright/valid-expect": "error",
      // Integration tests legitimately use conditionals for browser-specific
      // WebGL warmup and parallel-browser race condition handling
      "playwright/no-conditional-in-test": "off",
      "playwright/no-conditional-expect": "off",
      // WebGL warmup delays are necessary for Firefox/WebKit (see MEMORY.md)
      "playwright/no-wait-for-timeout": "off",
      // Skipped tests should be tracked and resolved
      "playwright/no-skipped-test": "warn",
      // Force option needed for Mapbox canvas interactions
      "playwright/no-force-option": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      "infra/",
      "**/playwright-report/",
      "**/test-results/",
    ],
  },
);

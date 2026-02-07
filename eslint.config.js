import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['e2e/**/*.ts', 'api/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Customize as needed
      'playwright/expect-expect': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/valid-expect': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '**/playwright-report/', '**/test-results/'],
  }
);

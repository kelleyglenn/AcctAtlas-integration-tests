# AcctAtlas Integration Tests

End-to-end and API integration tests for [AccountabilityAtlas](https://github.com/kelleyglenn/AccountabilityAtlas).

## Test Types

| Type | Location | Purpose | Status |
|------|----------|---------|--------|
| E2E | `e2e/` | Full browser-to-database user journeys | Active |
| API | `api/` | Service contract validation | Planned |

## Technology Stack

- **Framework:** [Playwright](https://playwright.dev/)
- **Language:** TypeScript
- **Browsers:** Chromium, Firefox, WebKit
- **Linting:** ESLint with [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright)
- **CI:** GitHub Actions

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for local full-stack testing)
- Full stack running (see [AccountabilityAtlas](https://github.com/kelleyglenn/AccountabilityAtlas))

## Running Tests Locally

### 1. Start the full stack

From the AccountabilityAtlas root:

```bash
./scripts/dev-start.sh
# or
docker-compose up -d
```

### 2. Run E2E tests

```bash
npm run test:e2e              # Run all tests headless
npm run test:e2e:headed       # Run with browser visible
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:debug        # Run with debugger
```

### 3. Lint the code

```bash
npm run lint                  # Check for linting errors
npm run lint:fix              # Auto-fix linting errors
```

### 4. View test report

```bash
npm run report
```

## Running Specific Tests

```bash
# Run tests in a specific file
npm run test:e2e -- e2e/tests/auth/login.spec.ts

# Run tests matching a pattern
npm run test:e2e -- --grep "valid credentials"

# Run on a specific browser
npm run test:e2e -- --project=chromium
```

## CI Behavior

Tests run automatically on:
- Push to `master`/`main`
- Pull requests to `master`/`main`
- Manual trigger via `workflow_dispatch`

The CI workflow:
1. Spins up the full stack via `docker-compose`
2. Runs tests on Chromium, Firefox, and WebKit
3. Uploads HTML report as artifact (retained 14 days)

## Project Structure

```
AcctAtlas-integration-tests/
├── e2e/
│   ├── tests/           # Test files organized by feature
│   │   ├── auth/        # Authentication tests
│   │   ├── videos/      # Video submission tests
│   │   └── moderation/  # Moderation workflow tests
│   ├── fixtures/        # Reusable test helpers
│   ├── seeds/           # SQL scripts for test data
│   └── playwright.config.ts
├── api/                 # Future: API-level tests
├── package.json
└── tsconfig.json
```

## Writing Tests

See the [Playwright documentation](https://playwright.dev/docs/writing-tests) for general guidance.

### Key patterns used in this project

**Semantic locators** (layout-resilient):
```typescript
await page.getByLabel('Email').fill('test@example.com');
await page.getByRole('button', { name: /log in/i }).click();
```

**API-based test setup**:
```typescript
import { createTestUser } from '../../fixtures/test-data';

test('example', async ({ page, request }) => {
  const user = await createTestUser(request);
  // ... test with the created user
});
```

**SQL seeds for edge cases**:
```typescript
// For states not creatable via API (e.g., moderator users)
// Run SQL seed before tests, then use known credentials
```

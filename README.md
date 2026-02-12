# AcctAtlas Integration Tests

End-to-end and API integration tests for [AccountabilityAtlas](https://github.com/kelleyglenn/AccountabilityAtlas).

## Test Types

| Type | Location | Purpose | Status |
|------|----------|---------|--------|
| E2E | `e2e/` | Full browser-to-database user journeys | Active |
| API | `api/` | Service contract validation | Active |

## Technology Stack

- **Framework:** [Playwright](https://playwright.dev/)
- **Language:** TypeScript
- **Browsers:** Chromium, Firefox, WebKit (E2E only)
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
docker-compose --profile backend --profile frontend up -d
```

### 2. Run tests

```bash
npm run test:api              # Run API tests only
npm run test:e2e              # Run E2E tests only
npm run test:all              # Run all tests (API + E2E)

# E2E with browser visible
npm run test:e2e:headed       # Run with browser visible
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:debug        # Run with debugger

# API debug mode
npm run test:api:debug        # Run API tests with debugger
```

### 3. Lint the code

```bash
npm run lint                  # Check for linting errors
npm run lint:fix              # Auto-fix linting errors
```

### 4. View test reports

```bash
npm run report                # View E2E test report
npm run report:api            # View API test report
```

## Running Specific Tests

```bash
# Run tests in a specific file
npm run test:e2e -- e2e/tests/auth/login.spec.ts
npm run test:api -- api/tests/health.spec.ts

# Run tests matching a pattern
npm run test:e2e -- --grep "valid credentials"
npm run test:api -- --grep "health"

# Run E2E on a specific browser
npm run test:e2e -- --project=chromium
```

## CI Behavior

Tests run automatically on:
- Push to `master`/`main`
- Pull requests to `master`/`main`
- Manual trigger via `workflow_dispatch`

The CI workflow:
1. Spins up the full stack via `docker-compose`
2. Runs API tests (no browser needed)
3. Runs E2E tests on Chromium, Firefox, and WebKit
4. Uploads HTML reports as artifacts (retained 14 days)

## Project Structure

```
AcctAtlas-integration-tests/
├── api/
│   ├── tests/               # API test files by service
│   │   ├── health.spec.ts           # Service health checks
│   │   ├── location-service.spec.ts # Location API tests
│   │   ├── video-service.spec.ts    # Video API tests
│   │   ├── moderation-service.spec.ts
│   │   └── search-service.spec.ts
│   ├── fixtures/            # API test helpers
│   │   └── api-helpers.ts   # User creation, auth helpers
│   └── playwright.config.ts
├── e2e/
│   ├── tests/               # E2E test files by feature
│   │   ├── auth/            # Authentication tests
│   │   ├── videos/          # Video submission tests
│   │   └── moderation/      # Moderation workflow tests
│   ├── fixtures/            # E2E test helpers
│   ├── seeds/               # SQL scripts for test data
│   └── playwright.config.ts
├── package.json
└── tsconfig.json
```

## Test Coverage

### API Tests (40 tests)

| Service | Tests | Coverage |
|---------|-------|----------|
| Health | 6 | All service health endpoints |
| Location | 10 | CRUD, spatial queries, clustering |
| Video | 14 | CRUD, access control, locations |
| Moderation | 5 | Queue access, abuse reports |
| Search | 8 | Filters, pagination, public access |

### E2E Tests (9 tests)

| Feature | Tests | Coverage |
|---------|-------|----------|
| Auth | 9 | Login flow across 3 browsers |

## Writing Tests

See the [Playwright documentation](https://playwright.dev/docs/writing-tests) for general guidance.

### API Test Patterns

**Using test helpers:**
```typescript
import { createTestUser, authHeaders } from '../fixtures/api-helpers';

test('creates a resource', async ({ request }) => {
  const user = await createTestUser(request);

  const response = await request.post(`${API_URL}/resources`, {
    data: { name: 'Test' },
    headers: authHeaders(user.accessToken),
  });

  expect(response.status()).toBe(201);
});
```

### E2E Test Patterns

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

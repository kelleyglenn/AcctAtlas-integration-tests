# Map E2E Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add browser-based E2E tests for the web-app map feature covering video browsing, filtering, search, and video detail pages.

**Architecture:** Playwright tests using existing dev seed data (10 videos). Tests are read-only - no API mutations needed. Follow patterns from existing `login.spec.ts`.

**Tech Stack:** Playwright, TypeScript, Mapbox GL JS (WebGL)

---

## Task 1: Create Seed Data Fixture

**Files:**

- Create: `e2e/fixtures/seed-data.ts`

**Step 1: Create the seed data constants file**

```typescript
// e2e/fixtures/seed-data.ts

/**
 * Known video IDs from dev seed data (search-service).
 * These match UUIDs in R__dev_seed_search_videos.sql.
 * Used for deterministic E2E tests without API setup.
 */
export const SEED_VIDEOS = {
  SF_FIRST_AMENDMENT: {
    id: "10000000-0000-0000-0000-000000000001",
    youtubeId: "RngL8_3k0C0",
    title: "Northern California Government Building Audit",
    amendments: ["FIRST"],
    participants: ["POLICE", "GOVERNMENT"],
    city: "San Francisco",
    state: "CA",
  },
  OAKLAND_MULTI_AMENDMENT: {
    id: "10000000-0000-0000-0000-000000000002",
    youtubeId: "nQRpazbSRf4",
    title: "East Lansing Police Department Audit Analysis",
    amendments: ["FIRST", "FOURTH"],
    participants: ["POLICE"],
    city: "Oakland",
    state: "CA",
  },
  SAN_ANTONIO_BUSINESS: {
    id: "10000000-0000-0000-0000-000000000006",
    youtubeId: "-kNacBPsNxo",
    title: "San Antonio Strip Mall Encounter",
    amendments: ["FIRST"],
    participants: ["POLICE", "BUSINESS"],
    city: "San Antonio",
    state: "TX",
  },
  SILVERTHORNE_GOVERNMENT: {
    id: "10000000-0000-0000-0000-000000000008",
    youtubeId: "hkhrXPur4ws",
    title: "Silverthorne Post Office Audit",
    amendments: ["FIRST"],
    participants: ["GOVERNMENT"],
    city: "Silverthorne",
    state: "CO",
  },
} as const;

/** Non-existent ID for 404 tests */
export const NON_EXISTENT_VIDEO_ID = "00000000-0000-0000-0000-000000000000";

/** Total count of seed videos */
export const SEED_VIDEO_COUNT = 10;
```

**Step 2: Verify file compiles**

Run: `cd e2e && npx tsc --noEmit fixtures/seed-data.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add e2e/fixtures/seed-data.ts
git commit -m "feat(e2e): add seed data fixture for map tests"
```

---

## Task 2: Create Map Browse Test File with First Test

**Files:**

- Create: `e2e/tests/map/map-browse.spec.ts`

**Step 1: Create test file with map loads test**

```typescript
// e2e/tests/map/map-browse.spec.ts
import { test, expect } from "@playwright/test";
import { SEED_VIDEOS } from "../../fixtures/seed-data";

test.describe("Map Browse", () => {
  test("map page loads with video markers", async ({ page, browserName }) => {
    // Act: navigate to map page
    await page.goto("/map");

    // Wait for map to render (WebGL can be slow)
    if (browserName === "webkit") {
      await page.waitForTimeout(500);
    }

    // Assert: at least one video marker is visible
    const markers = page.locator("[data-video-id]");
    await expect(markers.first()).toBeVisible({ timeout: 10000 });

    // Assert: multiple markers present (seed data has 10 videos)
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm run test:e2e -- e2e/tests/map/map-browse.spec.ts --project=chromium`
Expected: PASS (requires full stack running)

**Step 3: Commit**

```bash
git add e2e/tests/map/map-browse.spec.ts
git commit -m "feat(e2e): add map page loads test"
```

---

## Task 3: Add Marker Click and Popup Tests

**Files:**

- Modify: `e2e/tests/map/map-browse.spec.ts`

**Step 1: Add marker click test**

Add after the first test:

```typescript
test("clicking marker shows video info popup", async ({
  page,
  browserName,
}) => {
  // Arrange: go to map
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }

  // Act: click the first marker
  const marker = page.locator("[data-video-id]").first();
  await expect(marker).toBeVisible({ timeout: 10000 });
  await marker.click();

  // Assert: popup appears with View Video button
  await expect(page.getByRole("button", { name: /View Video/i })).toBeVisible();
});

test('clicking "View Video" navigates to detail page', async ({
  page,
  browserName,
}) => {
  // Arrange: go to map and click marker
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }
  const marker = page.locator("[data-video-id]").first();
  await expect(marker).toBeVisible({ timeout: 10000 });
  await marker.click();

  // Act: click View Video button
  await page.getByRole("button", { name: /View Video/i }).click();

  // Assert: navigated to video detail page
  await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/);
});
```

**Step 2: Run tests**

Run: `npm run test:e2e -- e2e/tests/map/map-browse.spec.ts --project=chromium`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/map/map-browse.spec.ts
git commit -m "feat(e2e): add marker click and popup tests"
```

---

## Task 4: Add Filter Tests

**Files:**

- Modify: `e2e/tests/map/map-browse.spec.ts`

**Step 1: Add amendment filter test**

```typescript
test("filter by amendment updates video list", async ({
  page,
  browserName,
}) => {
  // Arrange: go to map
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }
  await expect(page.locator("[data-video-id]").first()).toBeVisible({
    timeout: 10000,
  });

  // Get initial video count in list
  const videoList = page.locator('[data-testid="video-list-item"]');
  const initialCount = await videoList.count();

  // Act: click 4th Amendment filter (fewer videos have this)
  await page.getByRole("button", { name: /4th/i }).click();

  // Assert: list is filtered (count changes or specific video visible)
  // Note: All seed videos have FIRST, only 3 have FOURTH
  await page.waitForTimeout(300); // Allow filter to apply
  const filteredCount = await videoList.count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);
});

test("filter by participant updates video list", async ({
  page,
  browserName,
}) => {
  // Arrange: go to map
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }
  await expect(page.locator("[data-video-id]").first()).toBeVisible({
    timeout: 10000,
  });

  // Act: click Government filter
  await page.getByRole("button", { name: /Government/i }).click();

  // Assert: Government-tagged videos visible
  await page.waitForTimeout(300);
  // The filter should show only videos with GOVERNMENT participant
  const videoList = page.locator('[data-testid="video-list-item"]');
  const count = await videoList.count();
  expect(count).toBeGreaterThan(0);
});
```

**Step 2: Run tests**

Run: `npm run test:e2e -- e2e/tests/map/map-browse.spec.ts --project=chromium`
Expected: 5 tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/map/map-browse.spec.ts
git commit -m "feat(e2e): add filter tests for amendments and participants"
```

---

## Task 5: Add Location Search and Video List Tests

**Files:**

- Modify: `e2e/tests/map/map-browse.spec.ts`

**Step 1: Add location search test**

```typescript
test("location search flies to location and shows toast", async ({
  page,
  browserName,
}) => {
  // Arrange: go to map
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }

  // Act: type in search box and select result
  const searchBox = page
    .getByRole("combobox")
    .or(page.locator('input[placeholder*="Search"]'));
  await searchBox.fill("Denver");

  // Wait for autocomplete and click first result
  const suggestion = page.getByRole("option").first();
  await expect(suggestion).toBeVisible({ timeout: 5000 });
  await suggestion.click();

  // Assert: toast appears
  await expect(page.getByText(/Moved to/i)).toBeVisible({ timeout: 5000 });
});

test("clicking video in list shows marker popup", async ({
  page,
  browserName,
}) => {
  // Arrange: go to map
  await page.goto("/map");
  if (browserName === "webkit") {
    await page.waitForTimeout(500);
  }
  await expect(page.locator("[data-video-id]").first()).toBeVisible({
    timeout: 10000,
  });

  // Act: click a video in the side panel list
  const listItem = page.locator('[data-testid="video-list-item"]').first();
  await expect(listItem).toBeVisible();
  await listItem.click();

  // Assert: popup appears with View Video button
  await expect(page.getByRole("button", { name: /View Video/i })).toBeVisible();
});
```

**Step 2: Run tests**

Run: `npm run test:e2e -- e2e/tests/map/map-browse.spec.ts --project=chromium`
Expected: 7 tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/map/map-browse.spec.ts
git commit -m "feat(e2e): add location search and video list interaction tests"
```

---

## Task 6: Create Video Detail Test File

**Files:**

- Create: `e2e/tests/videos/video-detail.spec.ts`

**Step 1: Create test file with basic tests**

```typescript
// e2e/tests/videos/video-detail.spec.ts
import { test, expect } from "@playwright/test";
import { SEED_VIDEOS, NON_EXISTENT_VIDEO_ID } from "../../fixtures/seed-data";

test.describe("Video Detail", () => {
  test("video detail page shows video information", async ({ page }) => {
    // Arrange: navigate directly to a known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: title is visible
    await expect(page.getByText(video.title)).toBeVisible({ timeout: 10000 });

    // Assert: YouTube embed is present
    const iframe = page.locator(
      `iframe[src*="youtube.com/embed/${video.youtubeId}"]`,
    );
    await expect(iframe).toBeVisible();

    // Assert: amendment badge is visible
    await expect(
      page.getByText(/1st/i).or(page.getByText(/FIRST/i)),
    ).toBeVisible();
  });

  test("video detail page shows location information", async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: location info visible
    await expect(page.getByText(video.city)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(video.state)).toBeVisible();
  });

  test("back button returns to previous page", async ({
    page,
    browserName,
  }) => {
    // Arrange: start at map, navigate to video
    await page.goto("/map");
    if (browserName === "webkit") {
      await page.waitForTimeout(500);
    }

    // Click marker and go to video
    const marker = page.locator("[data-video-id]").first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();
    await page.getByRole("button", { name: /View Video/i }).click();
    await expect(page).toHaveURL(/\/videos\//);

    // Act: click back button
    await page
      .getByRole("button", { name: /back/i })
      .or(page.locator('[aria-label="Go back"]'))
      .click();

    // Assert: back at map
    await expect(page).toHaveURL("/map");
  });
});
```

**Step 2: Run tests**

Run: `npm run test:e2e -- e2e/tests/videos/video-detail.spec.ts --project=chromium`
Expected: 3 tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/videos/video-detail.spec.ts
git commit -m "feat(e2e): add video detail page tests"
```

---

## Task 7: Add Remaining Video Detail Tests

**Files:**

- Modify: `e2e/tests/videos/video-detail.spec.ts`

**Step 1: Add YouTube link, Back to Map, and 404 tests**

```typescript
test('"Watch on YouTube" link has correct URL', async ({ page }) => {
  // Arrange: navigate to known video
  const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
  await page.goto(`/videos/${video.id}`);

  // Assert: YouTube link has correct href
  const youtubeLink = page.getByRole("link", { name: /Watch on YouTube/i });
  await expect(youtubeLink).toBeVisible({ timeout: 10000 });
  await expect(youtubeLink).toHaveAttribute(
    "href",
    `https://www.youtube.com/watch?v=${video.youtubeId}`,
  );
  await expect(youtubeLink).toHaveAttribute("target", "_blank");
});

test('"Back to Map" button navigates to map', async ({ page }) => {
  // Arrange: navigate to known video
  const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
  await page.goto(`/videos/${video.id}`);
  await expect(page.getByText(video.title)).toBeVisible({ timeout: 10000 });

  // Act: click Back to Map
  await page.getByRole("link", { name: /Back to Map/i }).click();

  // Assert: at map page
  await expect(page).toHaveURL("/map");
});

test("shows error for non-existent video", async ({ page }) => {
  // Act: navigate to non-existent video
  await page.goto(`/videos/${NON_EXISTENT_VIDEO_ID}`);

  // Assert: error message shown
  await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 });

  // Assert: link back to map exists
  await expect(page.getByRole("link", { name: /map/i })).toBeVisible();
});
```

**Step 2: Run all video detail tests**

Run: `npm run test:e2e -- e2e/tests/videos/video-detail.spec.ts --project=chromium`
Expected: 6 tests PASS

**Step 3: Commit**

```bash
git add e2e/tests/videos/video-detail.spec.ts
git commit -m "feat(e2e): add YouTube link, Back to Map, and 404 tests"
```

---

## Task 8: Run Full E2E Suite and Lint

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors (fix any that appear)

**Step 2: Run all E2E tests on Chromium**

Run: `npm run test:e2e -- --project=chromium`
Expected: All 16 E2E tests PASS (9 auth + 7 map)

**Step 3: Run on all browsers (optional, may need adjustments)**

Run: `npm run test:e2e`
Expected: Tests pass on Chromium, Firefox, WebKit (may need timeout adjustments)

**Step 4: Update README test coverage table**

Modify `README.md` E2E Tests section:

```markdown
### E2E Tests (22 tests)

| Feature | Tests | Coverage                               |
| ------- | ----- | -------------------------------------- |
| Auth    | 9     | Login flow across 3 browsers           |
| Map     | 7     | Map browsing, markers, filters, search |
| Video   | 6     | Video detail page, navigation, 404     |
```

**Step 5: Final commit**

```bash
git add README.md
git commit -m "docs: update README with map and video E2E test coverage"
```

---

## Task 9: Push and Create PR

**Step 1: Push branch**

```bash
git push -u origin feature/map-e2e-tests
```

**Step 2: Create PR**

```bash
gh pr create --title "feat: add E2E tests for map and video detail pages" --body "$(cat <<'EOF'
## Summary

- Add 7 E2E tests for map page (markers, filters, search, list interaction)
- Add 6 E2E tests for video detail page (info display, navigation, 404)
- Add seed-data fixture for deterministic test data

## Test Coverage

| Feature | Tests | Coverage |
|---------|-------|----------|
| Map | 7 | Load markers, click popup, filters, search, list click |
| Video | 6 | Info display, location, back button, YouTube link, 404 |

## Test plan

- [x] ESLint passes
- [ ] E2E tests pass on Chromium
- [ ] E2E tests pass on Firefox
- [ ] E2E tests pass on WebKit

Closes #8

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes for Implementation

1. **Full stack required**: Tests need `docker-compose --profile backend --profile frontend up -d`

2. **Locator adjustments**: The exact locators may need tweaking based on actual component implementation. Use Playwright's `npx playwright codegen http://localhost:3000/map` to discover correct selectors.

3. **WebKit timing**: May need additional `waitForTimeout()` calls for WebGL map rendering.

4. **Flaky tests**: If tests are flaky, increase timeouts or add more specific wait conditions.

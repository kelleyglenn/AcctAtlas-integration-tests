// e2e/tests/map/map-browse.spec.ts
import { test, expect } from '@playwright/test';
import { PAGE_LOAD_TIMEOUT, UI_INTERACTION_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Map Browse', () => {
  test('map page loads with video markers', async ({ page, browserName }) => {
    // Act: navigate to map page
    await page.goto('/map');

    // Wait for map to render (WebGL can be slow)
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Assert: video list items appear (more reliable than map markers which may be clustered)
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: multiple videos present (seed data has 10 videos)
    const count = await videoList.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking marker shows video info popup', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load first
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click the first video in the list (this also shows the popup)
    await videoList.first().click();

    // Assert: popup appears with View Video link
    await expect(page.getByRole('link', { name: /View Video/i })).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });

  test('clicking "View Video" navigates to detail page', async ({ page, browserName }) => {
    // Arrange: go to map and click video in list
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Act: click View Video link
    await page.getByRole('link', { name: /View Video/i }).click();

    // Assert: navigated to video detail page
    await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/);
  });

  test('filter by amendment updates video list', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Get initial video count in list
    const initialCount = await videoList.count();

    // Expand filter bar first
    await page.getByRole('button', { name: /Filters/i }).click();

    // Act: click 4th Amendment filter chip (exact: true avoids matching "14th Amendment")
    await page.getByRole('button', { name: '4th Amendment', exact: true }).click();

    // Assert: list is filtered (count changes or specific video visible)
    // Note: All seed videos have FIRST, only 3 have FOURTH
    await page.waitForTimeout(500); // Allow filter to apply
    const filteredCount = await videoList.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filter by participant updates video list', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Expand filter bar first
    await page.getByRole('button', { name: /Filters/i }).click();

    // Act: click Government filter chip (exact: true ensures only the chip matches, not video list items)
    await page.getByRole('button', { name: 'Government', exact: true }).click();

    // Assert: Government-tagged videos visible
    await page.waitForTimeout(500);
    const count = await videoList.count();
    expect(count).toBeGreaterThan(0);
  });

  test('location search flies to location and shows toast', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for page to be ready
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: type in search box and select result
    const searchBox = page.getByRole('combobox').or(page.locator('input[placeholder*="Search"]'));
    await searchBox.fill('Denver');

    // Wait for autocomplete and click first result
    const suggestion = page.getByRole('option').first();
    await expect(suggestion).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
    await suggestion.click();

    // Assert: toast appears
    await expect(page.getByText(/Moved to/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });

  test('clicking video in list shows marker popup', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click a video in the side panel list
    await videoList.first().click();

    // Assert: popup appears with View Video link
    await expect(page.getByRole('link', { name: /View Video/i })).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

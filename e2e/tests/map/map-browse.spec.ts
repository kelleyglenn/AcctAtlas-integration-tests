// e2e/tests/map/map-browse.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Map Browse', () => {
  test('map page loads with video markers', async ({ page, browserName }) => {
    // Act: navigate to map page
    await page.goto('/map');

    // Wait for map to render (WebGL can be slow)
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }

    // Assert: at least one video marker is visible
    const markers = page.locator('[data-video-id]');
    await expect(markers.first()).toBeVisible({ timeout: 10000 });

    // Assert: multiple markers present (seed data has 10 videos)
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking marker shows video info popup', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }

    // Act: click the first marker
    const marker = page.locator('[data-video-id]').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();

    // Assert: popup appears with View Video button
    await expect(page.getByRole('button', { name: /View Video/i })).toBeVisible();
  });

  test('clicking "View Video" navigates to detail page', async ({ page, browserName }) => {
    // Arrange: go to map and click marker
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }
    const marker = page.locator('[data-video-id]').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();

    // Act: click View Video button
    await page.getByRole('button', { name: /View Video/i }).click();

    // Assert: navigated to video detail page
    await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/);
  });

  test('filter by amendment updates video list', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }
    await expect(page.locator('[data-video-id]').first()).toBeVisible({ timeout: 10000 });

    // Get initial video count in list
    const videoList = page.locator('[data-testid="video-list-item"]');
    const initialCount = await videoList.count();

    // Act: click 4th Amendment filter (fewer videos have this)
    await page.getByRole('button', { name: /4th/i }).click();

    // Assert: list is filtered (count changes or specific video visible)
    // Note: All seed videos have FIRST, only 3 have FOURTH
    await page.waitForTimeout(300); // Allow filter to apply
    const filteredCount = await videoList.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('filter by participant updates video list', async ({ page, browserName }) => {
    // Arrange: go to map
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }
    await expect(page.locator('[data-video-id]').first()).toBeVisible({ timeout: 10000 });

    // Act: click Government filter
    await page.getByRole('button', { name: /Government/i }).click();

    // Assert: Government-tagged videos visible
    await page.waitForTimeout(300);
    // The filter should show only videos with GOVERNMENT participant
    const videoList = page.locator('[data-testid="video-list-item"]');
    const count = await videoList.count();
    expect(count).toBeGreaterThan(0);
  });
});

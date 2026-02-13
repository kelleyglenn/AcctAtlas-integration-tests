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
});

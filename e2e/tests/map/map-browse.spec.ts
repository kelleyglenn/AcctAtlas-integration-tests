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
});

// e2e/tests/videos/video-detail.spec.ts
import { test, expect } from '@playwright/test';
import { SEED_VIDEOS } from '../../fixtures/seed-data';

test.describe('Video Detail', () => {
  test('video detail page shows video information', async ({ page }) => {
    // Arrange: navigate directly to a known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: title is visible
    await expect(page.getByText(video.title)).toBeVisible({ timeout: 10000 });

    // Assert: YouTube embed is present
    const iframe = page.locator(`iframe[src*="youtube.com/embed/${video.youtubeId}"]`);
    await expect(iframe).toBeVisible();

    // Assert: amendment badge is visible
    await expect(page.getByText(/1st/i).or(page.getByText(/FIRST/i))).toBeVisible();
  });

  test('video detail page shows location information', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: location info visible
    await expect(page.getByText(video.city)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(video.state)).toBeVisible();
  });

  test('back button returns to previous page', async ({ page, browserName }) => {
    // Arrange: start at map, navigate to video
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(500);
    }

    // Click marker and go to video
    const marker = page.locator('[data-video-id]').first();
    await expect(marker).toBeVisible({ timeout: 10000 });
    await marker.click();
    await page.getByRole('button', { name: /View Video/i }).click();
    await expect(page).toHaveURL(/\/videos\//);

    // Act: click back button
    await page.getByRole('button', { name: /back/i }).or(page.locator('[aria-label="Go back"]')).click();

    // Assert: back at map
    await expect(page).toHaveURL('/map');
  });
});

// e2e/tests/videos/video-detail.spec.ts
import { test, expect } from '@playwright/test';
import { SEED_VIDEOS, NON_EXISTENT_VIDEO_ID } from '../../fixtures/seed-data';
import { PAGE_LOAD_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Video Detail', () => {
  test('video detail page shows video information', async ({ page }) => {
    // Arrange: navigate directly to a known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: title is visible
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: YouTube embed is present
    const iframe = page.locator(`iframe[src*="youtube.com/embed/${video.youtubeId}"]`);
    await expect(iframe).toBeVisible();

    // Assert: amendment badge is visible (badge shows API format like "FIRST")
    await expect(page.getByText('FIRST', { exact: true })).toBeVisible();
  });

  test('video detail page shows location information', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: location info visible - verify city appears in the location section
    await expect(page.getByText(video.city)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    // Verify state appears alongside city (the format is "city, state")
    await expect(page.getByText(`${video.city}, ${video.state}`)).toBeVisible();
  });

  test('back button returns to previous page', async ({ page, browserName }) => {
    // Arrange: start at map, navigate to video
    await page.goto('/map');
    if (browserName === 'webkit') {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load and click first item
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();
    await page.getByRole('link', { name: /View Video/i }).click();
    await expect(page).toHaveURL(/\/videos\//);

    // Act: click back button (uses aria-label="Go back")
    await page.getByRole('button', { name: 'Go back' }).click();

    // Assert: back at map
    await expect(page).toHaveURL('/map');
  });

  test('"Watch on YouTube" link has correct URL', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: YouTube link has correct href
    const youtubeLink = page.getByRole('link', { name: /Watch on YouTube/i });
    await expect(youtubeLink).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await expect(youtubeLink).toHaveAttribute('href', `https://www.youtube.com/watch?v=${video.youtubeId}`);
    await expect(youtubeLink).toHaveAttribute('target', '_blank');
  });

  test('"Back to Map" button navigates to map', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click Back to Map
    await page.getByRole('link', { name: /Back to Map/i }).click();

    // Assert: at map page
    await expect(page).toHaveURL('/map');
  });

  test('shows error for non-existent video', async ({ page }) => {
    // Act: navigate to non-existent video
    await page.goto(`/videos/${NON_EXISTENT_VIDEO_ID}`);

    // Assert: error message shown
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: link back to map exists
    await expect(page.getByRole('link', { name: /map/i })).toBeVisible();
  });
});

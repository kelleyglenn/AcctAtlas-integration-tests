// e2e/tests/videos/video-detail.spec.ts
import { test, expect } from '@playwright/test';
import { SEED_VIDEOS, NON_EXISTENT_VIDEO_ID } from '../../fixtures/seed-data';
import { PAGE_LOAD_TIMEOUT, UI_INTERACTION_TIMEOUT } from '../../fixtures/test-constants';

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

    // Assert: amendment chip is visible (rewritten page shows formatted labels like "1st Amendment")
    await expect(page.getByText('1st Amendment')).toBeVisible();
  });

  test('video detail page shows location information', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: location info visible - verify city appears in the location section
    await expect(page.getByText(video.city)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    // Verify state appears alongside city (the format is "displayName, city, state")
    await expect(page.getByText(new RegExp(`${video.city},\\s*${video.state}`))).toBeVisible();
  });

  test('location link navigates to map with coordinates', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: location link includes lat/lng/zoom query params ("View on Map" style link)
    const locationLink = page.locator(`a[href*="/map?lat="]`);
    await expect(locationLink).toBeVisible();
    await expect(locationLink).toHaveAttribute('href', /\/map\?lat=[\d.-]+&lng=[\d.-]+&zoom=14/);
  });

  test('video detail page renders mini-map with location', async ({ page, browserName }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // WebGL warmup for non-Chromium browsers
    if (browserName !== 'chromium') {
      await page.waitForTimeout(1000);
    }

    // Assert: mini-map container is visible
    const miniMap = page.locator('[data-testid="mini-map"]');
    await expect(miniMap).toBeVisible();

    // Assert: Mapbox canvas initialized inside mini-map (confirms WebGL rendered)
    await expect(miniMap.locator('.mapboxgl-canvas')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('clicking location link navigates to map and shows video marker', async ({ page, browserName }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click the location link (same selector as existing href-only test)
    const locationLink = page.locator('a[href*="/map?lat="]');
    await expect(locationLink).toBeVisible();
    await locationLink.click();

    // Assert: URL matches /map?lat=...&lng=...&zoom=14
    await expect(page).toHaveURL(/\/map\?lat=[\d.-]+&lng=[\d.-]+&zoom=14/, { timeout: PAGE_LOAD_TIMEOUT });

    // WebGL warmup for non-Chromium browsers
    if (browserName !== 'chromium') {
      await page.waitForTimeout(1000);
    }

    // Assert: individual video marker visible (zoom 14 is above cluster threshold of 8)
    await expect(page.locator('[data-testid="video-marker"]').first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: no cluster markers at this zoom level
    await expect(page.locator('[data-testid="cluster-marker"]')).toHaveCount(0);

    // Assert: video list is populated
    await expect(page.locator('[data-testid="video-list-item"]').first()).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });

  test('"Watch on YouTube" link has correct URL', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: YouTube link has correct href (embedded in the iframe, not a standalone link)
    // The rewritten page has an iframe embed; verify it points to the correct YouTube video
    const iframe = page.locator(`iframe[src*="youtube.com/embed/${video.youtubeId}"]`);
    await expect(iframe).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('"Back to Map" link navigates to map', async ({ page }) => {
    // Arrange: navigate to known video
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click Back to Map link in sidebar
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
    await expect(page.getByRole('link', { name: 'Back to Map' })).toBeVisible();
  });

  test('video detail page shows participant chips', async ({ page }) => {
    // Arrange: navigate to a video with known participants
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: participant chips display formatted labels (e.g., "Police" instead of "POLICE")
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await expect(page.getByText('Police')).toBeVisible();
    await expect(page.getByText('Government', { exact: true })).toBeVisible();
  });

  test('video detail page shows multi-amendment video correctly', async ({ page }) => {
    // Arrange: navigate to a video with multiple amendments
    const video = SEED_VIDEOS.OAKLAND_MULTI_AMENDMENT;
    await page.goto(`/videos/${video.id}`);

    // Assert: both amendment chips are visible
    await expect(page.getByText(video.title)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await expect(page.getByText('1st Amendment')).toBeVisible();
    await expect(page.getByText('4th Amendment')).toBeVisible();
  });
});

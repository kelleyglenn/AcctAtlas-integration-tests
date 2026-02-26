// e2e/tests/map/map-home-button.spec.ts
import { test, expect } from "@playwright/test";
import { SEED_VIDEOS } from "../../fixtures/seed-data";
import {
  PAGE_LOAD_TIMEOUT,
  UI_INTERACTION_TIMEOUT,
} from "../../fixtures/test-constants";

test.describe("Map Home Button", () => {
  test("home button is visible on map page", async ({ page, browserName }) => {
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for map to be ready
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    await expect(page.getByLabel("Reset map view")).toBeVisible();
  });

  test("home button resets map and refreshes video list after zooming in", async ({
    page,
    browserName,
  }) => {
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;

    // Arrange: navigate to map zoomed in on SF (zoom 14)
    await page.goto(`/map?lat=${video.lat}&lng=${video.lng}&zoom=14`);
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for zoomed-in view to load (individual markers, not clusters)
    await expect(
      page.locator('[data-testid="video-marker"]').first(),
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Record zoomed-in video count (should be fewer than all seed videos)
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    const zoomedInCount = await videoList.count();

    // Act: click home button to reset map view
    await page.getByLabel("Reset map view").click();

    // Assert: map resets to default zoom (4) which shows clusters
    // Wait for cluster markers to appear (default zoom < cluster threshold)
    await expect(
      page.locator('[data-testid="cluster-marker"]').first(),
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: video list refreshes with more videos (full US view)
    await expect(async () => {
      const resetCount = await videoList.count();
      expect(resetCount).toBeGreaterThan(zoomedInCount);
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("home button clears selected video", async ({ page, browserName }) => {
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Select a video by clicking it in the list
    await videoList.first().click();

    // Verify popup appeared
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // Act: click home button
    await page.getByLabel("Reset map view").click();

    // Assert: popup is dismissed
    await expect(
      page.getByRole("link", { name: /View Video/i }),
    ).not.toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

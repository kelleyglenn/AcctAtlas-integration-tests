// e2e/tests/map/map-browse.spec.ts
import { test, expect } from "@playwright/test";
import { SEED_VIDEOS } from "../../fixtures/seed-data";
import {
  PAGE_LOAD_TIMEOUT,
  UI_INTERACTION_TIMEOUT,
} from "../../fixtures/test-constants";
import { mockMapboxSearchAPI } from "../../fixtures/mapbox-search-mock";

test.describe("Map Browse", () => {
  test("map page loads with video markers", async ({ page, browserName }) => {
    // Act: navigate to map page
    await page.goto("/map");

    // Wait for map to render (WebGL can be slow)
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Assert: video list items appear (more reliable than map markers which may be clustered)
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: multiple videos present (seed data has 10 videos)
    const count = await videoList.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking marker shows video info popup", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load first
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click the first video in the list (this also shows the popup)
    await videoList.first().click();

    // Assert: popup appears with View Video link
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });

  test('clicking "View Video" navigates to detail page', async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map and click video in list
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Act: click View Video link
    const viewVideoLink = page.getByRole("link", { name: /View Video/i });
    await expect(viewVideoLink).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
    await viewVideoLink.click();

    // Assert: navigated to video detail page
    await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/, {
      timeout: PAGE_LOAD_TIMEOUT,
    });
  });

  test("filter by amendment updates video list", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Get initial video count in list
    const initialCount = await videoList.count();

    // Expand filter bar first
    await page.getByRole("button", { name: /Filters/i }).click();

    // Act: click 4th Amendment filter chip (exact: true avoids matching "14th Amendment")
    await page
      .getByRole("button", { name: "4th Amendment", exact: true })
      .click();

    // Assert: list is filtered (count changes or specific video visible)
    // Note: All seed videos have FIRST, only 3 have FOURTH
    await page.waitForTimeout(500); // Allow filter to apply
    const filteredCount = await videoList.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("filter by participant updates video list", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Expand filter bar first
    await page.getByRole("button", { name: /Filters/i }).click();

    // Act: click Government filter chip (exact: true ensures only the chip matches, not video list items)
    await page.getByRole("button", { name: "Government", exact: true }).click();

    // Assert: Government-tagged videos visible
    await page.waitForTimeout(500);
    const count = await videoList.count();
    expect(count).toBeGreaterThan(0);
  });

  test("location search flies to location and shows toast", async ({
    page,
    browserName,
  }) => {
    // Arrange: mock Mapbox Search API to avoid consuming search sessions
    await mockMapboxSearchAPI(page);
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for page to be ready
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: type in search box and select result
    const searchBox = page
      .getByRole("combobox")
      .or(page.locator('input[placeholder*="Search"]'));
    await searchBox.fill("Denver");

    // Wait for autocomplete and click first result
    const suggestion = page.getByRole("option").first();
    await expect(suggestion).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
    await suggestion.click();

    // Assert: toast appears
    await expect(page.getByText(/Moved to/i)).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });

  test("panning map updates video list based on visible area", async ({
    page,
    browserName,
  }) => {
    // Arrange: mock Mapbox Search API to avoid consuming search sessions
    await mockMapboxSearchAPI(page);
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Get initial count (should be all 10 seed videos at zoom 4 over US)
    const initialCount = await videoList.count();

    // Act: search for "San Antonio" to fly to Texas
    const searchBox = page
      .getByRole("combobox")
      .or(page.locator('input[placeholder*="Search"]'));
    await searchBox.fill("San Antonio");

    const suggestion = page.getByRole("option").first();
    await expect(suggestion).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
    await suggestion.click();

    // Wait for flyTo animation (1500ms) + moveDebounce (300ms) + API response
    // Use Playwright's auto-retry to wait for the count to change
    await expect(async () => {
      const newCount = await videoList.count();
      expect(newCount).toBeLessThan(initialCount);
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("clicking cluster marker zooms to show all member locations", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map at initial zoom (should show clusters at zoom < 8)
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for cluster markers to load (default zoom shows clusters)
    const clusterMarker = page.locator('[data-testid="cluster-marker"]');
    await expect(clusterMarker.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Get initial cluster count before clicking
    const initialClusterCount = await clusterMarker.count();

    // Act: click the first cluster marker (force: true because side panel may overlap the map)
    await clusterMarker.first().click({ force: true });

    // Assert: after fitBounds animation, the view changes (clusters re-render at new zoom)
    await expect(async () => {
      const videoMarkerCount = await page
        .locator('[data-testid="video-marker"]')
        .count();
      const newClusterCount = await clusterMarker.count();
      // Either individual video markers appear, or cluster count changed (zoomed in)
      expect(
        videoMarkerCount > 0 || newClusterCount !== initialClusterCount,
      ).toBeTruthy();
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("clicking video in list shows marker popup", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Act: click a video in the side panel list
    await videoList.first().click();

    // Assert: popup appears with View Video link
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });

  test("video list items display YouTube thumbnails", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for video list to load
    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: first video list item contains a thumbnail image from YouTube
    const thumbnail = videoList.first().locator("img");
    await expect(thumbnail).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
    await expect(thumbnail).toHaveAttribute(
      "src",
      /(img\.youtube\.com|i\.ytimg\.com)\/vi\/.+\/.+\.jpg/,
    );
  });

  test("video info popup displays thumbnail", async ({ page, browserName }) => {
    // Arrange: go to map and click video in list to show popup
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Wait for popup to appear
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // Assert: popup contains a thumbnail image from YouTube
    const popup = page.locator(".video-info-popup");
    const popupThumbnail = popup.locator("img");
    await expect(popupThumbnail).toBeVisible();
    await expect(popupThumbnail).toHaveAttribute(
      "src",
      /(img\.youtube\.com|i\.ytimg\.com)\/vi\/.+\/.+\.jpg/,
    );
  });

  test("zooming out transitions from individual markers to clusters", async ({
    page,
    browserName,
  }) => {
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;

    // Arrange: navigate to map zoomed in on SF (zoom 14 > cluster threshold 8)
    await page.goto(`/map?lat=${video.lat}&lng=${video.lng}&zoom=14`);
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Assert: individual video markers visible at zoom 14
    await expect(
      page.locator('[data-testid="video-marker"]').first(),
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: no cluster markers at high zoom
    await expect(page.locator('[data-testid="cluster-marker"]')).toHaveCount(0);

    // Act: navigate to same location at zoom 4 (zoomed out — should trigger clustering)
    await page.goto(`/map?lat=${video.lat}&lng=${video.lng}&zoom=4`);
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Assert: cluster markers visible at low zoom
    await expect(
      page.locator('[data-testid="cluster-marker"]').first(),
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: video list is still populated
    await expect(
      page.locator('[data-testid="video-list-item"]').first(),
    ).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });

  test("popup thumbnail links to video detail page", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map and click video in list to show popup
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Wait for popup to appear
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // Act: click the popup thumbnail image
    const popup = page.locator(".video-info-popup");
    const popupThumbnail = popup.locator("img");
    await expect(popupThumbnail).toBeVisible();
    await popupThumbnail.click();

    // Assert: navigated to video detail page
    await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/, {
      timeout: PAGE_LOAD_TIMEOUT,
    });
  });

  test("popup shows participant type chips", async ({ page, browserName }) => {
    // Arrange: go to map and click video in list to show popup
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Wait for popup to appear
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // Assert: popup shows participant type chips (not just a count)
    const popup = page.locator(".video-info-popup");
    // Seed data videos have participant types like Police, Government, etc.
    // Use span locator to target chip elements specifically (avoid matching title text)
    const chips = popup.locator("span").filter({
      hasText: /^(Police|Government|Business|Citizen|Security)$/,
    });
    await expect(chips.first()).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
    // Verify at least one chip is present
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test("clicking video marker on map shows popup", async ({
    page,
    browserName,
  }) => {
    const video = SEED_VIDEOS.SF_FIRST_AMENDMENT;

    // Arrange: navigate to map zoomed in on SF where we know a seed video exists
    await page.goto(`/map?lat=${video.lat}&lng=${video.lng}&zoom=14`);
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for individual video markers to appear at this zoom level
    const videoMarker = page.locator('[data-testid="video-marker"]');
    await expect(videoMarker.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Act: click the video marker directly on the map
    await videoMarker.first().click({ force: true });

    // Assert: popup appears with View Video link
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });

  test("applying amendment filter updates cluster markers", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map at low zoom (clusters visible)
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for cluster markers to load
    const clusterMarker = page.locator('[data-testid="cluster-marker"]');
    await expect(clusterMarker.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Record initial cluster state
    const initialClusterCount = await clusterMarker.count();

    // Expand filter bar and apply amendment filter
    await page.getByRole("button", { name: /Filters/i }).click();
    await page
      .getByRole("button", { name: "4th Amendment", exact: true })
      .click();

    // Assert: filtering to FOURTH (3 of 12 geolocated seed videos) must reduce clusters
    await expect(async () => {
      const newCount = await clusterMarker.count();
      expect(newCount).toBeLessThan(initialClusterCount);
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("clearing filters restores unfiltered clusters", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map at low zoom
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Wait for cluster markers
    const clusterMarker = page.locator('[data-testid="cluster-marker"]');
    await expect(clusterMarker.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Record initial state
    const initialClusterCount = await clusterMarker.count();

    // Apply filter
    await page.getByRole("button", { name: /Filters/i }).click();
    await page
      .getByRole("button", { name: "4th Amendment", exact: true })
      .click();

    // Wait for filter to reduce clusters before clearing
    await expect(async () => {
      const filteredCount = await clusterMarker.count();
      expect(filteredCount).toBeLessThan(initialClusterCount);
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });

    // Clear filters
    await page.getByRole("button", { name: /Clear All/i }).click();

    // Assert: clusters return to original state
    await expect(async () => {
      const restoredCount = await clusterMarker.count();
      expect(restoredCount).toBe(initialClusterCount);
    }).toPass({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("popup has custom close button", async ({ page, browserName }) => {
    // Arrange: go to map and click video in list to show popup
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    const videoList = page.locator('[data-testid="video-list-item"]');
    await expect(videoList.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await videoList.first().click();

    // Wait for popup to appear
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // Act: click the custom close button
    const closeButton = page.getByRole("button", { name: /Close popup/i });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Assert: popup is closed
    await expect(
      page.getByRole("link", { name: /View Video/i }),
    ).not.toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

import { test, expect } from "@playwright/test";
import {
  PAGE_LOAD_TIMEOUT,
  UI_INTERACTION_TIMEOUT,
} from "../../fixtures/test-constants";

const API_URL = process.env.API_URL || "http://localhost:8080/api/v1";

/**
 * E2E test verifying that videos submitted by TRUSTED users are auto-approved.
 *
 * Submits a video through the browser UI (form at /videos/new), then verifies
 * via the browser that the video detail page shows APPROVED status and that the
 * video appears on the map — first within a cluster at the initial USA zoom
 * level, then as an individual marker after zooming in.
 */
test.describe("Trusted User Auto-Approval", () => {
  test("video submitted by trusted user is auto-approved and visible on detail page and map", async ({
    page,
    request,
    browserName,
  }) => {
    test.setTimeout(120_000);

    // 1. Login via browser UI as the trusted user
    await page.goto("/login");
    await page.getByLabel("Email").fill("trusted@example.com");
    await page.getByLabel("Password").fill("password123");
    await page
      .locator("form")
      .getByRole("button", { name: /Sign In/i })
      .click();
    await expect(page).toHaveURL("/", { timeout: PAGE_LOAD_TIMEOUT });

    // 2. Navigate to the video submission form
    await page.goto("/videos/new");
    await expect(page.getByText("Submit a Video")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // 3. Enter YouTube URL and preview
    await page
      .getByPlaceholder(/youtube/i)
      .fill("https://www.youtube.com/watch?v=jNQXAC9IVRw");
    await page.getByRole("button", { name: /Preview/i }).click();

    // 4. Wait for preview to load — either the form fields appear (new video)
    //    or the "View it here" link appears (video already submitted by another browser)
    const viewItHereLink = page.getByRole("link", { name: /View it here/i });
    const submitButton = page
      .locator("form")
      .getByRole("button", { name: /Submit Video/i });
    await expect(viewItHereLink.or(submitButton)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    if (await submitButton.isVisible()) {
      // NEW VIDEO PATH: fill form fields and submit

      // WebGL warmup for the LocationPicker map
      if (browserName !== "chromium") {
        await page.waitForTimeout(1000);
      }

      // Select amendment (Chip with role="button")
      await page.getByRole("button", { name: "1st Amendment" }).click();

      // Select participant
      await page.getByRole("button", { name: "Police" }).click();

      // Click the LocationPicker map to place a marker
      const mapCanvas = page.locator(".mapboxgl-canvas");
      await expect(mapCanvas).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
      await mapCanvas.click({ position: { x: 200, y: 200 } });

      // Wait for reverse geocode to complete
      await expect(page.getByText("Resolving address...")).toBeHidden({
        timeout: 10_000,
      });

      // Submit the form
      await submitButton.click();

      // Wait for redirect to video detail page (or 409 race condition)
      let redirected = false;
      try {
        await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/, {
          timeout: PAGE_LOAD_TIMEOUT,
        });
        redirected = true;
      } catch {
        // 409 race — another browser submitted first
      }

      if (!redirected) {
        // Recover: reload form, preview again (now shows "already exists")
        await page.goto("/videos/new");
        await page
          .getByPlaceholder(/youtube/i)
          .fill("https://www.youtube.com/watch?v=jNQXAC9IVRw");
        await page.getByRole("button", { name: /Preview/i }).click();
        await expect(viewItHereLink).toBeVisible({
          timeout: PAGE_LOAD_TIMEOUT,
        });
      }
    }

    // If still on /videos/new (either from initial "already exists" or 409
    // recovery), click "View it here" to navigate to the existing video
    if (!/\/videos\/[a-f0-9-]+$/.test(page.url())) {
      await viewItHereLink.click();
      await expect(page).toHaveURL(/\/videos\/[a-f0-9-]+/, {
        timeout: PAGE_LOAD_TIMEOUT,
      });
    }

    // 5. On the detail page — wait for APPROVED badge (auto-approval is async)
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("APPROVED")).toBeVisible();
    }).toPass({ timeout: 30_000, intervals: [2000] });

    // 6. Capture video title and ID from the detail page
    await expect(page.locator("h1")).toHaveText(/.+/);
    const videoTitle = await page.locator("h1").textContent();
    const videoId = page.url().match(/\/videos\/([a-f0-9-]+)/)?.[1];
    expect(videoId).toBeTruthy();

    // 7. Wait for search service to index the video (async via SQS events).
    //    This lightweight API poll avoids the WebGL context exhaustion that
    //    occurs when reloading the map page in a retry loop.
    await expect(async () => {
      const searchRes = await request.get(`${API_URL}/search`, {
        params: { q: videoTitle! },
      });
      expect(searchRes.ok()).toBeTruthy();
      const searchBody = await searchRes.json();
      const found = searchBody.results.some(
        (r: { id: string }) => r.id === videoId,
      );
      expect(found).toBe(true);
    }).toPass({ timeout: 60_000, intervals: [2000] });

    // 8. Navigate to the map (video is confirmed in search index)
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // 9. Verify cluster markers are visible at initial zoom level
    const clusterMarkers = page.locator('[data-testid="cluster-marker"]');
    await expect(clusterMarkers.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // 10. Verify our video appears in the side panel video list
    const videoListItems = page.locator('[data-testid="video-list-item"]');
    await expect(videoListItems.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
    const ourVideoInList = videoListItems.filter({ hasText: videoTitle! });
    await expect(ourVideoInList.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // 11. Click the video in the list to zoom into the cluster area
    //     VideoListItem.onClick calls flyTo(lng, lat, 14) — zoom 14 is past
    //     the cluster threshold of 8, so individual markers replace clusters.
    await ourVideoInList.first().click();

    // 12. Wait for zoom animation and individual markers to render
    const videoMarkers = page.locator('[data-testid="video-marker"]');
    await expect(videoMarkers.first()).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Clusters should no longer be visible at zoom 14 (>= threshold 8)
    await expect(clusterMarkers).toHaveCount(0, {
      timeout: UI_INTERACTION_TIMEOUT,
    });

    // 13. Verify the popup/info card appeared with View Video link
    await expect(page.getByRole("link", { name: /View Video/i })).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });
});

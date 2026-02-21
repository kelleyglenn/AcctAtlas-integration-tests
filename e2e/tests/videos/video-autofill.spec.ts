import { test, expect } from "@playwright/test";
import { createTestUser, loginViaUI } from "../../fixtures/test-data";
import {
  PAGE_LOAD_TIMEOUT,
  UI_INTERACTION_TIMEOUT,
} from "../../fixtures/test-constants";

// Use a video that is NOT in the seed data so the form is shown (not "already exists")
const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=kJQP7kiw5Fk";
const TEST_VIDEO_TITLE_FRAGMENT = "Despacito";

test.describe("Video Auto-fill with AI", () => {
  test("Auto-fill button is not visible before preview", async ({
    page,
    request,
    browserName,
  }) => {
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    await loginViaUI(page, user.email, user.password, browserName);
    await page.goto("/videos/new");
    await expect(page.getByText("Submit a Video")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Auto-fill button should not be visible before preview
    await expect(page.getByText("Auto-fill with AI")).toBeHidden();
  });

  test("Auto-fill button appears after successful preview", async ({
    page,
    request,
    browserName,
  }) => {
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    await loginViaUI(page, user.email, user.password, browserName);
    await page.goto("/videos/new");
    await expect(page.getByText("Submit a Video")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Enter a YouTube URL and click Preview
    await page.getByPlaceholder(/youtube/i).fill(TEST_VIDEO_URL);
    await page.getByRole("button", { name: "Preview" }).click();

    // Wait for preview to load (shows video title)
    await expect(page.getByText(TEST_VIDEO_TITLE_FRAGMENT)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Auto-fill button should now be visible
    await expect(page.getByText("Auto-fill with AI")).toBeVisible();
  });

  test("Auto-fill completes extraction without error", async ({
    page,
    request,
    browserName,
  }) => {
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    await loginViaUI(page, user.email, user.password, browserName);
    await page.goto("/videos/new");
    await expect(page.getByText("Submit a Video")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Enter a YouTube URL and click Preview
    await page.getByPlaceholder(/youtube/i).fill(TEST_VIDEO_URL);
    await page.getByRole("button", { name: "Preview" }).click();

    // Wait for preview to load
    await expect(page.getByText(TEST_VIDEO_TITLE_FRAGMENT)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Click Auto-fill with AI
    await page.getByRole("button", { name: "Auto-fill with AI" }).click();

    // Wait for extraction to complete — Claude API call may take several seconds
    await expect(
      page.getByRole("button", { name: "Auto-fill with AI" }),
    ).toBeEnabled({ timeout: 30_000 });

    // Verify success toast appeared (not an error toast)
    await expect(page.getByText("AI suggestions applied")).toBeVisible({
      timeout: UI_INTERACTION_TIMEOUT,
    });
  });
});

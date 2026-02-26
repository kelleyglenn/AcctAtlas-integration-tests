// e2e/tests/home/page-titles.spec.ts
import { test, expect } from "@playwright/test";
import { SEED_VIDEOS, SEED_USERS } from "../../fixtures/seed-data";
import { PAGE_LOAD_TIMEOUT } from "../../fixtures/test-constants";
import { createTestUser, loginViaUI } from "../../fixtures/test-data";

test.describe("Page Titles", () => {
  test.describe("static pages", () => {
    test("home page has default title", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle("AccountabilityAtlas");
    });

    test("login page has correct title", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveTitle("Sign In | AccountabilityAtlas");
    });

    test("register page has correct title", async ({ page }) => {
      await page.goto("/register");
      await expect(page).toHaveTitle("Register | AccountabilityAtlas");
    });

    test("map page has correct title", async ({ page, browserName }) => {
      await page.goto("/map");
      if (browserName !== "chromium") {
        await page.waitForTimeout(1000);
      }
      await expect(page).toHaveTitle("Map | AccountabilityAtlas");
    });

    test("submit video page has correct title", async ({
      page,
      request,
      browserName,
    }) => {
      // Must be logged in to access submit page
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      await loginViaUI(page, user.email, user.password, browserName);

      await page.goto("/videos/new");
      await expect(page).toHaveTitle("Submit Video | AccountabilityAtlas");
    });

    test("profile page has correct title", async ({
      page,
      request,
      browserName,
    }) => {
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      await loginViaUI(page, user.email, user.password, browserName);

      await page.goto("/profile");
      await expect(page).toHaveTitle("My Profile | AccountabilityAtlas");
    });
  });

  test.describe("dynamic pages", () => {
    test("video detail page shows video title", async ({ page }) => {
      const video = SEED_VIDEOS.SILVERTHORNE_GOVERNMENT;
      await page.goto(`/videos/${video.id}`);

      // Wait for page to load video data
      await expect(page.getByText(video.title)).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      });

      await expect(page).toHaveTitle(`${video.title} | AccountabilityAtlas`);
    });

    test("video detail page falls back for non-existent video", async ({
      page,
    }) => {
      await page.goto("/videos/00000000-0000-0000-0000-000000000000");

      await expect(page).toHaveTitle("Video | AccountabilityAtlas", {
        timeout: PAGE_LOAD_TIMEOUT,
      });
    });

    test("public profile page shows user display name", async ({ page }) => {
      const user = SEED_USERS.TRUSTED_SUBMITTER;
      await page.goto(`/users/${user.id}`);

      await expect(page.getByRole("heading")).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      });

      await expect(page).toHaveTitle(
        `${user.displayName} | AccountabilityAtlas`,
      );
    });

    test("public profile page falls back for non-existent user", async ({
      page,
    }) => {
      await page.goto("/users/00000000-0000-0000-0000-000000000099");

      await expect(page).toHaveTitle("User Profile | AccountabilityAtlas", {
        timeout: PAGE_LOAD_TIMEOUT,
      });
    });
  });
});

// e2e/tests/auth/login-redirect.spec.ts
import { test, expect } from "@playwright/test";
import { createTestUser } from "../../fixtures/test-data";
import {
  PAGE_LOAD_TIMEOUT,
  UI_INTERACTION_TIMEOUT,
} from "../../fixtures/test-constants";

test.describe("Login Redirect", () => {
  test("Sign In link from map passes redirect param", async ({
    page,
    browserName,
  }) => {
    // Arrange: go to map page (not logged in)
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }

    // Act: click Sign In in the nav bar
    await page.getByRole("link", { name: /Sign In/i }).click();

    // Assert: redirected to login with redirect param
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmap/, {
      timeout: PAGE_LOAD_TIMEOUT,
    });
  });

  test("Sign In link from home page has no redirect param", async ({
    page,
  }) => {
    await page.goto("/");

    // Act: click Sign In
    await page.getByRole("link", { name: /Sign In/i }).click();

    // Assert: plain /login with no redirect param
    await expect(page).toHaveURL("/login", { timeout: PAGE_LOAD_TIMEOUT });
  });

  test("after login, redirects back to original page", async ({
    page,
    request,
    browserName,
  }) => {
    // Arrange: create a test user
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Navigate to map, then click Sign In
    await page.goto("/map");
    if (browserName !== "chromium") {
      await page.waitForTimeout(1000);
    }
    await page.getByRole("link", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmap/, {
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Act: fill in credentials and submit
    const emailField = page.getByLabel("Email");
    const passwordField = page.getByLabel("Password");

    if (browserName === "webkit") {
      await emailField.click();
      await emailField.fill(user.email);
      await passwordField.click();
      await passwordField.fill(user.password);
    } else {
      await emailField.fill(user.email);
      await passwordField.fill(user.password);
    }
    await page
      .locator("form")
      .getByRole("button", { name: /Sign In/i })
      .click();

    // Assert: redirected back to /map (not /)
    await expect(page).toHaveURL("/map", { timeout: PAGE_LOAD_TIMEOUT });

    // Assert: user is logged in (nav shows display name or avatar)
    await expect(
      page.getByRole("navigation").getByText(user.displayName),
    ).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

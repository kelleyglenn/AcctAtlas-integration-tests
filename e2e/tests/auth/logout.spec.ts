import { test, expect } from "@playwright/test";
import { createTestUser } from "../../fixtures/test-data";
import { PAGE_LOAD_TIMEOUT } from "../../fixtures/test-constants";

test.describe("Logout", () => {
  test("user can sign out", async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    await page.goto("/login");
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
    await expect(page).toHaveURL("/");

    const nav = page.getByRole("navigation");

    // Verify user is authenticated
    await expect(nav.getByText(user.displayName)).toBeVisible();

    // Act: click Sign Out in the nav bar
    await nav.getByRole("button", { name: "Sign Out" }).click();

    // Assert: user is logged out
    await expect(nav.getByRole("link", { name: /Sign In/i })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
    // Display name should no longer be visible
    await expect(nav.getByText(user.displayName)).toBeHidden();
    // Submit Video button should be hidden
    await expect(nav.getByRole("link", { name: /Submit Video/i })).toBeHidden();
  });
});

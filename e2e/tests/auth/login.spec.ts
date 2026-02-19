import { test, expect } from "@playwright/test";
import { createTestUser } from "../../fixtures/test-data";
import { PAGE_LOAD_TIMEOUT } from "../../fixtures/test-constants";

test.describe("Login", () => {
  test("user can log in with valid credentials", async ({
    page,
    request,
    browserName,
  }) => {
    // Arrange: create a user via API
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Act: log in through the UI
    await page.goto("/login");
    const emailField = page.getByLabel("Email");
    const passwordField = page.getByLabel("Password");

    if (browserName === "webkit") {
      // WebKit needs explicit clicks before filling inputs
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

    // Assert: redirected to profile/home
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("navigation").getByText(user.displayName),
    ).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page, browserName }) => {
    // Act: attempt login with invalid credentials
    await page.goto("/login");
    const emailField = page.getByLabel("Email");
    const passwordField = page.getByLabel("Password");

    if (browserName === "webkit") {
      // WebKit needs explicit clicks before filling inputs
      await emailField.click();
      await emailField.fill("nobody@example.com");
      await passwordField.click();
      await passwordField.fill("WrongPassword");
    } else {
      await emailField.fill("nobody@example.com");
      await passwordField.fill("WrongPassword");
    }
    await page
      .locator("form")
      .getByRole("button", { name: /Sign In/i })
      .click();

    // Assert: error message displayed (API response can be slow under parallel test load)
    await expect(
      page.getByRole("alert").getByText(/Email or password is incorrect/i),
    ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");

    // Verify key elements are present
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.locator("form").getByRole("button", { name: /Sign In/i }),
    ).toBeVisible();
  });
});

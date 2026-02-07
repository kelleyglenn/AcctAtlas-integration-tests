import { test, expect } from '@playwright/test';
import { createTestUser } from '../../fixtures/test-data';

test.describe('Login', () => {
  test('user can log in with valid credentials', async ({ page, request, browserName }) => {
    // Arrange: create a user via API
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Act: log in through the UI
    await page.goto('/login');
    if (browserName === 'webkit') {
      await page.waitForTimeout(100); // WebKit needs extra time for form readiness
    }
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Assert: redirected to profile/home
    await expect(page).toHaveURL('/');
    await expect(page.getByText(user.displayName)).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page, browserName }) => {
    // Act: attempt login with invalid credentials
    await page.goto('/login');
    if (browserName === 'webkit') {
      await page.waitForTimeout(200); // WebKit needs extra time for form readiness
    }
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('WrongPassword');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Assert: error message displayed
    await expect(page.getByRole('alert').getByText(/Email or password is incorrect/i)).toBeVisible();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');

    // Verify key elements are present
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });
});

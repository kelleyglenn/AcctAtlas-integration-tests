import { test, expect } from '@playwright/test';
import { createTestUser } from '../../fixtures/test-data';

test.describe('Login', () => {
  test('user can log in with valid credentials', async ({ page, request }) => {
    // Arrange: create a user via API
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Act: log in through the UI
    await page.goto('/login');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: /log in/i }).click();

    // Assert: redirected to profile/home
    await expect(page).toHaveURL('/profile');
    await expect(page.getByText(user.displayName)).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    // Act: attempt login with invalid credentials
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('WrongPassword');
    await page.getByRole('button', { name: /log in/i }).click();

    // Assert: error message displayed
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');

    // Verify key elements are present
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });
});

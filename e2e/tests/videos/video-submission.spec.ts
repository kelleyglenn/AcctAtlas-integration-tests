import { test, expect } from '@playwright/test';
import { createTestUser } from '../../fixtures/test-data';
import { PAGE_LOAD_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Video Submission', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/videos/new');

    // Should redirect to /login with redirect param
    await expect(page).toHaveURL(/\/login/, { timeout: PAGE_LOAD_TIMEOUT });
  });

  test('submit video page is accessible after login', async ({ page, request, browserName }) => {
    // Arrange: create a user via API
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Act: login with redirect to submission page
    await page.goto('/login?redirect=/videos/new');
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');

    if (browserName === 'webkit') {
      await emailField.click();
      await emailField.fill(user.email);
      await passwordField.click();
      await passwordField.fill(user.password);
    } else {
      await emailField.fill(user.email);
      await passwordField.fill(user.password);
    }
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Assert: redirected to video submission page
    await expect(page).toHaveURL('/videos/new', { timeout: PAGE_LOAD_TIMEOUT });

    // Verify key form elements are present
    await expect(page.getByText('Submit a Video')).toBeVisible();
    await expect(page.getByPlaceholderText(/youtube/i)).toBeVisible();
  });

  test('nav bar shows Submit Video button when authenticated', async ({
    page,
    request,
    browserName,
  }) => {
    // Arrange: create a user via API
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    // Act: login through UI
    await page.goto('/login');
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');

    if (browserName === 'webkit') {
      await emailField.click();
      await emailField.fill(user.email);
      await passwordField.click();
      await passwordField.fill(user.password);
    } else {
      await emailField.fill(user.email);
      await passwordField.fill(user.password);
    }
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/');

    // Assert: Submit Video button is visible in nav
    await expect(page.getByRole('link', { name: /Submit Video/i })).toBeVisible();
  });

  test('nav bar does not show Submit Video button when unauthenticated', async ({ page }) => {
    await page.goto('/');

    // Assert: Submit Video button is NOT visible
    await expect(page.getByRole('link', { name: /Submit Video/i })).toBeHidden();
  });

  test('Submit Video nav link navigates to submission page', async ({
    page,
    request,
    browserName,
  }) => {
    // Arrange: create a user and login
    const user = await createTestUser(request);
    expect(user.response.ok()).toBeTruthy();

    await page.goto('/login');
    const emailField = page.getByLabel('Email');
    const passwordField = page.getByLabel('Password');

    if (browserName === 'webkit') {
      await emailField.click();
      await emailField.fill(user.email);
      await passwordField.click();
      await passwordField.fill(user.password);
    } else {
      await emailField.fill(user.email);
      await passwordField.fill(user.password);
    }
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/');

    // Act: click Submit Video link in nav
    await page.getByRole('link', { name: /Submit Video/i }).click();

    // Assert: navigated to submission page
    await expect(page).toHaveURL('/videos/new', { timeout: PAGE_LOAD_TIMEOUT });
    await expect(page.getByText('Submit a Video')).toBeVisible();
  });
});

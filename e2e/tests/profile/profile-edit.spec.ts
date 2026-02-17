import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI } from '../../fixtures/test-data';
import { PAGE_LOAD_TIMEOUT, UI_INTERACTION_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Profile Edit', () => {
  test('profile page shows current user info', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const displayName = `Profile View ${Date.now()}`;
    const user = await createTestUser(request, { displayName });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile page
    await page.goto('/profile');

    // Assert: current user info is displayed
    await expect(page.getByText(displayName)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('can edit display name and see update persist', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const timestamp = Date.now();
    const originalName = `Edit Name ${timestamp}`;
    const user = await createTestUser(request, { displayName: originalName });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and edit display name
    await page.goto('/profile');
    await expect(page.getByText(originalName)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const newName = `Updated Name ${timestamp}`;
    const displayNameInput = page.getByLabel(/display name/i);
    await displayNameInput.clear();
    await displayNameInput.fill(newName);
    await page.getByRole('button', { name: /save/i }).first().click();

    // Assert: success feedback shown
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });

    // Assert: change persists after reload
    await page.reload();
    await expect(page.getByText(newName)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('can add social links', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Social Links ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and add a YouTube social link
    await page.goto('/profile');
    await expect(page.getByText(user.displayName)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const youtubeInput = page.getByLabel(/youtube/i);
    await youtubeInput.fill('UCtest123');
    await page.getByRole('button', { name: /save/i }).last().click();

    // Assert: success feedback shown
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });

    // Assert: change persists after reload
    await page.reload();
    await expect(page.getByLabel(/youtube/i)).toHaveValue('UCtest123', { timeout: PAGE_LOAD_TIMEOUT });
  });

  test('can toggle privacy settings', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Privacy Toggle ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and toggle social links visibility
    await page.goto('/profile');
    await expect(page.getByText(user.displayName)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const socialLinksToggle = page.getByLabel(/social links.*visible/i);
    await socialLinksToggle.click();

    // Privacy settings auto-save on toggle — no explicit Save button needed
    // Assert: success feedback shown
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

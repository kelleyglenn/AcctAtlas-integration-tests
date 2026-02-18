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
    await expect(page.getByRole('heading', { name: displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
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
    await expect(page.getByRole('heading', { name: originalName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const newName = `Changed Name ${timestamp}`;
    const displayNameInput = page.getByLabel(/display name/i);
    await displayNameInput.clear();
    await displayNameInput.fill(newName);
    await page.getByRole('button', { name: /save/i }).first().click();

    // Assert: success feedback shown (avoid matching the new display name)
    await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });

    // Assert: change persists after reload
    await page.reload();
    await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('can add social links', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Social Links ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and add a YouTube social link
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: user.displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const youtubeInput = page.getByLabel(/youtube/i);
    await youtubeInput.fill('UCtest123');
    await page.getByRole('button', { name: /save/i }).last().click();

    // Assert: success feedback shown
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });

    // Assert: change persists after reload
    await page.reload();
    await expect(page.getByLabel(/youtube/i)).toHaveValue('UCtest123', { timeout: PAGE_LOAD_TIMEOUT });
  });

  test('profile header shows avatar placeholder, trust tier badge, and member since', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const displayName = `Header Check ${Date.now()}`;
    const user = await createTestUser(request, { displayName });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile page
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    // Assert: avatar placeholder (initials) is visible since no avatar is set
    await expect(page.locator('[data-testid="profile-avatar-placeholder"]')).toBeVisible();

    // Assert: trust tier badge is visible
    await expect(page.locator('[data-testid="trust-tier-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="trust-tier-badge"]')).toHaveText('NEW');

    // Assert: member since is visible
    await expect(page.getByText(/member since/i)).toBeVisible();

    // Assert: Change Avatar button is visible
    await expect(page.locator('[data-testid="change-avatar-button"]')).toBeVisible();
  });

  test('Change Avatar button opens picker with Gravatar source', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Avatar Pick ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and click Change Avatar
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: user.displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await page.locator('[data-testid="change-avatar-button"]').click();

    // Assert: modal opens with Gravatar source
    await expect(page.locator('[data-testid="avatar-picker-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="avatar-source-gravatar"]')).toBeVisible();
  });

  test('selecting Gravatar avatar saves and displays it', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Avatar Save ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile, open picker, select Gravatar
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: user.displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    await page.locator('[data-testid="change-avatar-button"]').click();
    await expect(page.locator('[data-testid="avatar-picker-modal"]')).toBeVisible();
    await page.locator('[data-testid="avatar-source-gravatar"]').click();

    // Assert: success toast shown
    await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });

    // Assert: avatar image is now visible (replacing initials placeholder)
    await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible();

    // Assert: avatar persists after reload
    await page.reload();
    await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('can toggle privacy settings', async ({ page, request, browserName }) => {
    // Arrange: create and login a user
    const user = await createTestUser(request, { displayName: `Privacy Toggle ${Date.now()}` });
    expect(user.response.ok()).toBeTruthy();
    await loginViaUI(page, user.email, user.password, browserName);

    // Act: navigate to profile and toggle social links visibility
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: user.displayName })).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });

    const socialLinksToggle = page.getByLabel(/social links.*visible/i);
    await socialLinksToggle.click();

    // Privacy settings auto-save on toggle — no explicit Save button needed
    // Assert: success feedback shown
    await expect(page.getByText(/saved|updated/i)).toBeVisible({ timeout: UI_INTERACTION_TIMEOUT });
  });
});

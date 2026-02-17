import { test, expect } from '@playwright/test';
import { PAGE_LOAD_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Public Profile', () => {
  // Seed user ID from dev seed data (submitter of all seed videos)
  // This is "Trusted User" who submitted all 10 seed videos (8 approved, 2 rejected)
  const seedUserId = '00000000-0000-0000-0000-000000000003';

  test('public profile shows display name and avatar', async ({ page }) => {
    await page.goto(`/users/${seedUserId}`);
    // Should show display name (from seed data: "Trusted User")
    await expect(page.getByRole('heading')).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
    // Should show member since
    await expect(page.getByText(/member since/i)).toBeVisible();
  });

  test('public profile shows approved video count', async ({ page }) => {
    await page.goto(`/users/${seedUserId}`);
    await expect(page.getByText(/\d+ approved video/i)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });

  test('returns 404 for non-existent user', async ({ page }) => {
    await page.goto('/users/00000000-0000-0000-0000-000000000099');
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT });
  });
});

import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI } from '../../fixtures/test-data';
import { PAGE_LOAD_TIMEOUT } from '../../fixtures/test-constants';

test.describe('Hero Landing Page', () => {
  test.describe('Hero Section', () => {
    test('displays headline and subheadline', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: 'See Where Constitutional Rights Are Tested' })
      ).toBeVisible();

      await expect(
        page.getByText('AccountabilityAtlas organizes citizen-recorded audit videos')
      ).toBeVisible();
    });

    test('displays CTA buttons for unauthenticated user', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('link', { name: 'Explore the Map' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create Free Account' }).first()).toBeVisible();
    });

    test('displays auth-aware CTAs when logged in', async ({ page, request, browserName }) => {
      // Arrange: create user and log in
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      await loginViaUI(page, user.email, user.password, browserName);

      // Act: navigate to home page
      await page.goto('/');

      // Assert: "Submit a Video" shown instead of "Create Free Account"
      await expect(page.getByRole('link', { name: 'Submit a Video' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create Free Account' })).toHaveCount(0);
    });
  });

  test.describe('Stats Strip', () => {
    test('displays all three stats', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('8,000+ Videos Mapped')).toBeVisible();
      await expect(page.getByText('All 50 States Represented')).toBeVisible();
      await expect(page.getByText('1st, 2nd, 4th, 5th, and 14th Amendments Indexed')).toBeVisible();
    });
  });

  test.describe('How It Works', () => {
    test('displays heading and three cards', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: 'How AccountabilityAtlas Works' })
      ).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
      await expect(page.getByText('Browse audit videos geographically')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Understand' })).toBeVisible();
      await expect(page.getByText('Filter by constitutional amendment and participant type')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Contribute' })).toBeVisible();
      await expect(page.getByText('Submit YouTube videos, tag them')).toBeVisible();
    });
  });

  test.describe('Why It Matters', () => {
    test('displays heading and three cards', async ({ page }) => {
      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: 'Why Geographic Context Changes Everything' })
      ).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Pattern Recognition' })).toBeVisible();
      await expect(page.getByText('trends become visible across jurisdictions')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Public Record' })).toBeVisible();
      await expect(page.getByText('searchable, geographic archive')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Civic Transparency' })).toBeVisible();
      await expect(page.getByText('public accountability and research')).toBeVisible();
    });
  });

  test.describe('Final CTA', () => {
    test('displays heading and CTA buttons', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Start Exploring' })).toBeVisible();
      await expect(page.getByText('No account required to browse the map.')).toBeVisible();

      // Final CTA section should have Explore the Map and Create Free Account links
      const exploreLinks = page.getByRole('link', { name: 'Explore the Map' });
      await expect(exploreLinks).toHaveCount(2); // Hero + Final CTA

      const createAccountLinks = page.getByRole('link', { name: 'Create Free Account' });
      await expect(createAccountLinks).toHaveCount(2); // Hero + Final CTA
    });
  });

  test.describe('Navigation', () => {
    test('"Explore the Map" CTA navigates to /map', async ({ page }) => {
      await page.goto('/');

      // Click the first "Explore the Map" link (in hero section)
      await page.getByRole('link', { name: 'Explore the Map' }).first().click();

      await expect(page).toHaveURL('/map', { timeout: PAGE_LOAD_TIMEOUT });
    });

    test('"Create Free Account" CTA navigates to /register', async ({ page }) => {
      await page.goto('/');

      await page.getByRole('link', { name: 'Create Free Account' }).first().click();

      await expect(page).toHaveURL('/register', { timeout: PAGE_LOAD_TIMEOUT });
    });
  });

  test.describe('NavBar', () => {
    test('NavBar is transparent on home page with z-50 stacking', async ({ page }) => {
      await page.goto('/');

      const nav = page.getByRole('navigation');
      await expect(nav).toHaveClass(/bg-transparent/);
      await expect(nav).not.toHaveClass(/border-b/);
      await expect(nav).toHaveClass(/z-50/);
    });

    test('NavBar is opaque on other pages with z-50 stacking', async ({ page }) => {
      await page.goto('/login');

      const nav = page.getByRole('navigation');
      await expect(nav).toHaveClass(/bg-white/);
      await expect(nav).toHaveClass(/border-b/);
      await expect(nav).toHaveClass(/z-50/);
    });
  });
});

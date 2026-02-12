import { test, expect } from '@playwright/test';
import { API_URL } from '../fixtures/api-helpers';

test.describe('Search Service API', () => {
  test.describe('Video Search', () => {
    test('returns empty results when no videos exist', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.totalElements).toBeGreaterThanOrEqual(0);
    });

    test('supports text query search', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          q: 'police audit',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
    });

    test('supports amendment filter', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          amendments: 'FIRST',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      // All results should have FIRST amendment if any exist
      for (const result of body.results) {
        expect(result.amendments).toContain('FIRST');
      }
    });

    test('supports participant filter', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          participants: 'POLICE',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      // All results should have POLICE participant if any exist
      for (const result of body.results) {
        expect(result.participants).toContain('POLICE');
      }
    });

    test('supports state filter', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          state: 'AZ',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
    });

    test('supports pagination', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          page: 0,
          size: 10,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.pagination.page).toBe(0);
      expect(body.pagination.size).toBe(10);
    });

    test('supports multiple filters combined', async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          amendments: 'FIRST',
          participants: 'POLICE',
          state: 'AZ',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
    });
  });

  test.describe('Search is Public', () => {
    test('does not require authentication', async ({ request }) => {
      // Search should work without auth header
      const response = await request.get(`${API_URL}/search`);

      expect(response.ok()).toBeTruthy();
      // Should NOT be 401 or 403
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });
  });
});

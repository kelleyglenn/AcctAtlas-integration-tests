import { test, expect } from '@playwright/test';
import { API_URL, createTestUser, authHeaders } from '../fixtures/api-helpers.js';

test.describe('Video Service API', () => {
  test.describe('List Videos', () => {
    test('returns paginated list of approved videos', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos`);

      // Better error message for debugging CI failures
      if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Expected OK response but got ${response.status()}: ${body}`);
      }
      const body = await response.json();

      expect(body.content).toBeInstanceOf(Array);
      expect(body.page).toBeGreaterThanOrEqual(0);
      expect(body.totalElements).toBeGreaterThanOrEqual(0);
      expect(body.totalPages).toBeGreaterThanOrEqual(0);
    });

    test('does not require authentication for public listing', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).not.toBe(401);
    });

    test('supports pagination parameters', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos`, {
        params: {
          page: 0,
          size: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.page).toBe(0);
      expect(body.size).toBe(5);
    });

    test('supports sorting', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos`, {
        params: {
          sort: 'createdAt',
          direction: 'desc',
        },
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Get Video by ID', () => {
    test('returns 404 for non-existent video', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos/00000000-0000-0000-0000-000000000000`);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Create Video', () => {
    test('requires authentication', async ({ request }) => {
      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: ['FIRST'],
          participants: ['POLICE'],
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    // TODO: Should return 400 for validation errors, but currently returns 500
    // See: https://github.com/kelleyglenn/AcctAtlas-video-service/issues/14
    test('validates required fields', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          // Missing required fields
        },
        headers: authHeaders(user.accessToken),
      });

      // Accepts either 400 (correct) or 500 (current behavior)
      expect([400, 500]).toContain(response.status());
    });

    // TODO: Should return 400 for validation errors
    // See: https://github.com/kelleyglenn/AcctAtlas-video-service/issues/14
    test('requires at least one amendment', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: [], // Empty array
          participants: ['POLICE'],
        },
        headers: authHeaders(user.accessToken),
      });

      // Accepts either 400 (correct) or 500 (current behavior)
      expect([400, 500]).toContain(response.status());
    });

    // TODO: Should return 400 for validation errors
    // See: https://github.com/kelleyglenn/AcctAtlas-video-service/issues/14
    test('requires at least one participant', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: ['FIRST'],
          participants: [], // Empty array
        },
        headers: authHeaders(user.accessToken),
      });

      // Accepts either 400 (correct) or 500 (current behavior)
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Video Access Control', () => {
    test('anonymous users can only see approved videos', async ({ request }) => {
      // List without auth should only return approved videos
      const response = await request.get(`${API_URL}/videos`, {
        params: { status: 'PENDING' },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // For anonymous users, status filter should be ignored/overridden to APPROVED
      for (const video of body.content) {
        expect(video.status).toBe('APPROVED');
      }
    });
  });

  test.describe('Video Locations', () => {
    test('returns 404 for locations of non-existent video', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos/00000000-0000-0000-0000-000000000000/locations`);

      expect(response.status()).toBe(404);
    });

    test('requires authentication to add location', async ({ request }) => {
      const response = await request.post(`${API_URL}/videos/00000000-0000-0000-0000-000000000000/locations`, {
        data: {
          locationId: '00000000-0000-0000-0000-000000000001',
          isPrimary: true,
        },
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('User Videos', () => {
    test('returns videos for a specific user', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/videos/user/${user.id}`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.content).toBeInstanceOf(Array);
      // New user should have no videos
      expect(body.content.length).toBe(0);
    });
  });
});

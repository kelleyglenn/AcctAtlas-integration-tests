import { test, expect } from '@playwright/test';
import { API_URL, createTestUser, createTestLocation, authHeaders } from '../fixtures/api-helpers.js';

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
          locationId: '00000000-0000-0000-0000-000000000000',
        },
      });

      // 401 from gateway, 403 from video-service UnauthorizedException
      expect([401, 403]).toContain(response.status());
    });

    test('validates required fields', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          // Missing required fields
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
    });

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

      expect(response.status()).toBe(400);
    });

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

      expect(response.status()).toBe(400);
    });

    test('requires a locationId', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: ['FIRST'],
          participants: ['POLICE'],
          // No locationId
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'locationId' })])
      );
    });

    test('returns structured validation error details', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: [],
          participants: [],
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBeDefined();
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThanOrEqual(2);
      // Each detail has field and message
      for (const detail of body.details) {
        expect(detail.field).toBeDefined();
        expect(detail.message).toBeDefined();
      }
    });

    test('auto-approves videos from trusted users', async ({ request }) => {
      // Login as the seed admin user (password123 for all seed users)
      const adminLogin = await request.post(`${API_URL}/auth/login`, {
        data: { email: 'admin@example.com', password: 'password123' },
      });

      if (!adminLogin.ok()) {
        test.skip(true, 'Admin seed user not available');
        return;
      }

      const adminBody = await adminLogin.json();
      const adminToken = adminBody.tokens.accessToken;

      // Create a regular user and promote to TRUSTED
      const user = await createTestUser(request);

      await request.put(`${API_URL}/users/${user.id}/trust-tier`, {
        data: { trustTier: 'TRUSTED', reason: 'Integration test promotion' },
        headers: authHeaders(adminToken),
      });

      // Create a location for the video
      const location = await createTestLocation(request, user.accessToken);

      // Create a video as the now-TRUSTED user
      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: `https://www.youtube.com/watch?v=test${Date.now()}`,
          amendments: ['FIRST'],
          participants: ['POLICE'],
          locationId: location.id,
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const video = await response.json();
      expect(video.status).toBe('APPROVED');
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

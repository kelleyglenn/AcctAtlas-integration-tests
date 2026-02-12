import { test, expect } from '@playwright/test';
import { API_URL, createTestUser, authHeaders } from '../fixtures/api-helpers.js';

test.describe('Moderation Service API', () => {
  test.describe('Queue Access Control', () => {
    test('requires authentication to access queue', async ({ request }) => {
      const response = await request.get(`${API_URL}/moderation/queue`);

      // Should return 401 or 403 without auth
      expect([401, 403]).toContain(response.status());
    });

    test('requires moderator role to access queue', async ({ request }) => {
      // Create a regular user (NEW trust tier)
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/moderation/queue`, {
        headers: authHeaders(user.accessToken),
      });

      // Regular users should get 403 Forbidden
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Queue Stats', () => {
    test('requires moderator role for stats', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/moderation/queue/stats`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Abuse Reports', () => {
    test('requires authentication to submit report', async ({ request }) => {
      const response = await request.post(`${API_URL}/moderation/reports`, {
        data: {
          contentType: 'VIDEO',
          contentId: '00000000-0000-0000-0000-000000000000',
          reason: 'SPAM',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test('requires moderator role to list reports', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/moderation/reports`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(403);
    });
  });
});

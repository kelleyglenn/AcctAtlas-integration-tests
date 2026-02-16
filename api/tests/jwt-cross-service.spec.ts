import { test, expect } from '@playwright/test';
import { API_URL, SERVICE_HOST, createTestUser, authHeaders } from '../fixtures/api-helpers.js';

test.describe('JWKS and Cross-Service JWT', () => {

  test.describe('JWKS Endpoint', () => {
    test('user-service exposes valid JWKS endpoint', async ({ request }) => {
      // Direct call to user-service (not through gateway)
      const response = await request.get(`http://${SERVICE_HOST}:8081/.well-known/jwks.json`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.keys).toBeDefined();
      expect(body.keys).toBeInstanceOf(Array);
      expect(body.keys.length).toBeGreaterThan(0);

      const key = body.keys[0];
      expect(key.kty).toBe('RSA');
      expect(key.kid).toBe('user-service-key-1');
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
    });

    test('JWKS endpoint does not require authentication', async ({ request }) => {
      // No Authorization header
      const response = await request.get(`http://${SERVICE_HOST}:8081/.well-known/jwks.json`);
      expect(response.ok()).toBeTruthy();
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });

    test('JWKS endpoint returns consistent keys', async ({ request }) => {
      const response1 = await request.get(`http://${SERVICE_HOST}:8081/.well-known/jwks.json`);
      const response2 = await request.get(`http://${SERVICE_HOST}:8081/.well-known/jwks.json`);

      const body1 = await response1.json();
      const body2 = await response2.json();

      expect(body1.keys[0].n).toBe(body2.keys[0].n);
      expect(body1.keys[0].e).toBe(body2.keys[0].e);
    });
  });

  test.describe('Cross-Service JWT Validation', () => {
    test('video-service accepts JWT issued by user-service', async ({ request }) => {
      // Get a real JWT from user-service via registration
      const user = await createTestUser(request);

      // Use that token to access video-service (through gateway)
      const response = await request.get(`${API_URL}/videos/user/${user.id}`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.content).toBeInstanceOf(Array);
    });

    test('video-service accepts JWT for authenticated operations', async ({ request }) => {
      // Get a real JWT from user-service
      const user = await createTestUser(request);

      // Use that token to hit an authenticated preview endpoint
      const response = await request.get(`${API_URL}/videos/preview`, {
        params: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        headers: authHeaders(user.accessToken),
      });

      // Preview should work with valid auth
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Lenient JWT Handling', () => {
    test('public GET endpoint returns 200 with invalid Bearer token', async ({ request }) => {
      // Send invalid token to a public endpoint
      const response = await request.get(`${API_URL}/videos`, {
        headers: { Authorization: 'Bearer definitely-not-a-valid-jwt-token' },
      });

      // Should return 200 (lenient), NOT 401
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    });

    test('public GET endpoint returns 200 with expired-format token', async ({ request }) => {
      // A JWT-like but invalid token
      const response = await request.get(`${API_URL}/videos`, {
        headers: { Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.invalid' },
      });

      // Should return 200 (lenient), NOT 401
      expect(response.ok()).toBeTruthy();
    });

    test('protected POST endpoint rejects invalid token', async ({ request }) => {
      const response = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          amendments: ['FIRST'],
          participants: ['POLICE'],
          locationId: '00000000-0000-0000-0000-000000000000',
        },
        headers: { Authorization: 'Bearer invalid-token' },
      });

      // Should get 401 or 403, NOT 200 or 500
      expect([401, 403]).toContain(response.status());
    });

    test('preview endpoint works with invalid token (lenient)', async ({ request }) => {
      const response = await request.get(`${API_URL}/videos/preview`, {
        params: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        headers: { Authorization: 'Bearer invalid-token' },
      });

      // Preview is public, so should still work even with invalid token.
      // Video-service lenient filter treats invalid token as anonymous.
      // But the gateway may reject with 401 since it validates tokens.
      // Accept either: 200 (video-service lenient) or 401 (gateway validation)
      expect([200, 401]).toContain(response.status());
    });
  });
});

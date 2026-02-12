import { test, expect } from '@playwright/test';
import { API_URL, createTestUser, authHeaders } from '../fixtures/api-helpers.js';

test.describe('User Service API', () => {
  test.describe('Registration', () => {
    test('registers a new user with valid data', async ({ request }) => {
      const userData = {
        email: `register-test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        displayName: 'Registration Test User',
      };

      const response = await request.post(`${API_URL}/auth/register`, {
        data: userData,
      });

      expect(response.status()).toBe(201);
      const body = await response.json();

      // Response includes user and tokens
      expect(body.user).toBeDefined();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toBe(userData.email);
      expect(body.user.displayName).toBe(userData.displayName);
      expect(body.user.trustTier).toBe('NEW');
      expect(body.user.emailVerified).toBe(false);

      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
      expect(body.tokens.expiresIn).toBeGreaterThan(0);
    });

    test('rejects registration with duplicate email', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: user.email,
          password: 'AnotherPass123!',
          displayName: 'Duplicate User',
        },
      });

      expect(response.status()).toBe(409);
    });

    test('validates required fields', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          // Missing all required fields
        },
      });

      expect(response.status()).toBe(400);
    });

    test('validates email format', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: 'not-an-email',
          password: 'TestPass123!',
          displayName: 'Test User',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('validates password strength', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `weak-pass-${Date.now()}@example.com`,
          password: 'weak', // Too short, missing requirements
          displayName: 'Test User',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('validates display name length', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `short-name-${Date.now()}@example.com`,
          password: 'TestPass123!',
          displayName: 'X', // Too short (min 2 chars)
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Login', () => {
    test('logs in with valid credentials', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(user.id);
      expect(body.user.email).toBe(user.email);

      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
    });

    test('rejects invalid password', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: user.email,
          password: 'WrongPassword123!',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('rejects non-existent email', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: `nonexistent-${Date.now()}@example.com`,
          password: 'TestPass123!',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('validates required fields', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          // Missing email and password
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Token Refresh', () => {
    // TODO: Token refresh endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/22
    test.skip('refreshes tokens with valid refresh token', async ({ request }) => {
      // Register to get initial tokens
      const userData = {
        email: `refresh-test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        displayName: 'Refresh Test User',
      };

      const registerResponse = await request.post(`${API_URL}/auth/register`, {
        data: userData,
      });
      const registerBody = await registerResponse.json();
      const refreshToken = registerBody.tokens.refreshToken;

      const response = await request.post(`${API_URL}/auth/refresh`, {
        data: {
          refreshToken,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
      // Refresh token should be rotated (different from original)
      expect(body.tokens.refreshToken).not.toBe(refreshToken);
    });

    // TODO: Token refresh endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/22
    test.skip('rejects invalid refresh token', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/refresh`, {
        data: {
          refreshToken: 'invalid-refresh-token',
        },
      });

      expect(response.status()).toBe(401);
    });

    // TODO: Token refresh endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/22
    test.skip('rejects reused refresh token', async ({ request }) => {
      // Register to get initial tokens
      const userData = {
        email: `reuse-test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        displayName: 'Reuse Test User',
      };

      const registerResponse = await request.post(`${API_URL}/auth/register`, {
        data: userData,
      });
      const registerBody = await registerResponse.json();
      const refreshToken = registerBody.tokens.refreshToken;

      // First refresh should succeed
      const firstRefresh = await request.post(`${API_URL}/auth/refresh`, {
        data: { refreshToken },
      });
      expect(firstRefresh.ok()).toBeTruthy();

      // Second refresh with same token should fail (token rotation)
      const secondRefresh = await request.post(`${API_URL}/auth/refresh`, {
        data: { refreshToken },
      });
      expect(secondRefresh.status()).toBe(401);
    });
  });

  test.describe('Logout', () => {
    // TODO: Logout endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/23
    test.skip('requires authentication', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/logout`);

      expect([401, 403]).toContain(response.status());
    });

    // TODO: Logout endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/23
    test.skip('logs out authenticated user', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/logout`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(204);
    });
  });

  test.describe('Get Current User Profile', () => {
    test('requires authentication', async ({ request }) => {
      const response = await request.get(`${API_URL}/users/me`);

      expect([401, 403]).toContain(response.status());
    });

    test('returns current user profile', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/me`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email);
      expect(body.displayName).toBe(user.displayName);
      expect(body.trustTier).toBe('NEW');
    });
  });

  test.describe('Update Current User Profile', () => {
    test('requires authentication', async ({ request }) => {
      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          displayName: 'Updated Name',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    // TODO: Profile update endpoint returns 500
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/24
    test.skip('updates display name', async ({ request }) => {
      const user = await createTestUser(request);
      const newDisplayName = `Updated Name ${Date.now()}`;

      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          displayName: newDisplayName,
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.displayName).toBe(newDisplayName);
    });

    // TODO: Profile update endpoint returns 500
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/24
    test.skip('updates avatar URL', async ({ request }) => {
      const user = await createTestUser(request);
      const avatarUrl = 'https://example.com/avatar.jpg';

      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          avatarUrl,
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.avatarUrl).toBe(avatarUrl);
    });

    // TODO: Profile update endpoint returns 500 instead of 400
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/24
    test.skip('validates display name length', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          displayName: 'X', // Too short
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Get User Public Profile', () => {
    test('requires authentication', async ({ request }) => {
      const response = await request.get(`${API_URL}/users/00000000-0000-0000-0000-000000000000`);

      expect([401, 403]).toContain(response.status());
    });

    test('returns public profile for existing user', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/${user.id}`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.id).toBe(user.id);
      expect(body.displayName).toBe(user.displayName);
      expect(body.trustTier).toBe('NEW');
      // Public profile should NOT include email
      expect(body.email).toBeUndefined();
    });

    test('returns 404 for non-existent user', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/00000000-0000-0000-0000-000000000000`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Trust Tier Management', () => {
    test('requires authentication to update trust tier', async ({ request }) => {
      const response = await request.put(`${API_URL}/users/00000000-0000-0000-0000-000000000000/trust-tier`, {
        data: {
          trustTier: 'TRUSTED',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test('requires admin role to update trust tier', async ({ request }) => {
      const user = await createTestUser(request);
      const targetUser = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/${targetUser.id}/trust-tier`, {
        data: {
          trustTier: 'TRUSTED',
          reason: 'Test promotion',
        },
        headers: authHeaders(user.accessToken),
      });

      // Regular users should get 403 Forbidden
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Password Reset', () => {
    // TODO: Password reset endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip('accepts password reset request', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/password/reset`, {
        data: {
          email: user.email,
        },
      });

      // Should return 202 regardless of whether email exists (prevents enumeration)
      expect(response.status()).toBe(202);
    });

    // TODO: Password reset endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip('accepts reset request for non-existent email', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/password/reset`, {
        data: {
          email: `nonexistent-${Date.now()}@example.com`,
        },
      });

      // Should return 202 to prevent email enumeration
      expect(response.status()).toBe(202);
    });

    // TODO: Password reset endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip('validates email format', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/password/reset`, {
        data: {
          email: 'not-an-email',
        },
      });

      expect(response.status()).toBe(400);
    });

    // TODO: Password reset confirm endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip('rejects invalid reset token', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/password/reset/confirm`, {
        data: {
          token: 'invalid-reset-token',
          newPassword: 'NewSecurePass123!',
        },
      });

      expect(response.status()).toBe(400);
    });
  });
});

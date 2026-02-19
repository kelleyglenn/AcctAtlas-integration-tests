import { test, expect } from "@playwright/test";
import {
  API_URL,
  createTestUser,
  authHeaders,
} from "../fixtures/api-helpers.js";

test.describe("User Service API", () => {
  test.describe("Registration", () => {
    test("registers a new user with valid data", async ({ request }) => {
      const userData = {
        email: `register-test-${Date.now()}@example.com`,
        password: "TestPass123!",
        displayName: "Registration Test User",
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
      expect(body.user.trustTier).toBe("NEW");
      expect(body.user.emailVerified).toBe(false);

      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
      expect(body.tokens.expiresIn).toBeGreaterThan(0);
    });

    test("rejects registration with duplicate email", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: user.email,
          password: "AnotherPass123!",
          displayName: "Duplicate User",
        },
      });

      expect(response.status()).toBe(409);
    });

    test("validates required fields", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          // Missing all required fields
        },
      });

      expect(response.status()).toBe(400);
    });

    test("validates email format", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: "not-an-email",
          password: "TestPass123!",
          displayName: "Test User",
        },
      });

      expect(response.status()).toBe(400);
    });

    test("validates password strength", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `weak-pass-${Date.now()}@example.com`,
          password: "weak", // Too short, missing requirements
          displayName: "Test User",
        },
      });

      expect(response.status()).toBe(400);
    });

    test("validates display name length", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `short-name-${Date.now()}@example.com`,
          password: "TestPass123!",
          displayName: "X", // Too short (min 2 chars)
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("Login", () => {
    test("logs in with valid credentials", async ({ request }) => {
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

    test("rejects invalid password", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: user.email,
          password: "WrongPassword123!",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("rejects non-existent email", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: `nonexistent-${Date.now()}@example.com`,
          password: "TestPass123!",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("validates required fields", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          // Missing email and password
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("Token Refresh", () => {
    // TODO: Token refresh endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/22
    test.skip("refreshes tokens with valid refresh token", async ({
      request,
    }) => {
      // Register to get initial tokens
      const userData = {
        email: `refresh-test-${Date.now()}@example.com`,
        password: "TestPass123!",
        displayName: "Refresh Test User",
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
    test.skip("rejects invalid refresh token", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/refresh`, {
        data: {
          refreshToken: "invalid-refresh-token",
        },
      });

      expect(response.status()).toBe(401);
    });

    // TODO: Token refresh endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/22
    test.skip("rejects reused refresh token", async ({ request }) => {
      // Register to get initial tokens
      const userData = {
        email: `reuse-test-${Date.now()}@example.com`,
        password: "TestPass123!",
        displayName: "Reuse Test User",
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

  test.describe("Logout", () => {
    test("requires authentication", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/logout`);

      expect([401, 403]).toContain(response.status());
    });

    test("logs out authenticated user", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/auth/logout`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(204);
    });
  });

  test.describe("Get Current User Profile", () => {
    test("requires authentication", async ({ request }) => {
      const response = await request.get(`${API_URL}/users/me`);

      expect([401, 403]).toContain(response.status());
    });

    test("returns current user profile", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/me`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email);
      expect(body.displayName).toBe(user.displayName);
      expect(body.trustTier).toBe("NEW");
    });
  });

  test.describe("Update Current User Profile", () => {
    test("requires authentication", async ({ request }) => {
      const response = await request.put(`${API_URL}/users/me`, {
        data: { displayName: "Updated Name" },
      });
      expect([401, 403]).toContain(response.status());
    });

    test("updates display name", async ({ request }) => {
      const user = await createTestUser(request);
      const newName = `Updated ${Date.now()}`;

      const response = await request.put(`${API_URL}/users/me`, {
        data: { displayName: newName },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.displayName).toBe(newName);
    });

    test("updates avatar URL", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: { avatarUrl: "https://gravatar.com/avatar/test123" },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.avatarUrl).toBe("https://gravatar.com/avatar/test123");
    });

    test("supports partial updates (preserves other fields)", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: { displayName: "Partial Update" },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.displayName).toBe("Partial Update");
      expect(body.email).toBe(user.email); // Unchanged
    });

    test("validates display name minimum length", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: { displayName: "X" }, // Too short (min 2)
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
    });

    test("updates social links", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          socialLinks: {
            youtube: "UCtest123",
            instagram: "testhandle",
          },
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.socialLinks.youtube).toBe("UCtest123");
      expect(body.socialLinks.instagram).toBe("testhandle");
    });

    test("updates privacy settings", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: {
          privacySettings: {
            socialLinksVisibility: "PUBLIC",
            submissionsVisibility: "REGISTERED",
          },
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.privacySettings.socialLinksVisibility).toBe("PUBLIC");
      expect(body.privacySettings.submissionsVisibility).toBe("REGISTERED");
    });

    test("clears social link field when updated to empty string", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      // Set initial value
      await request.put(`${API_URL}/users/me`, {
        data: { socialLinks: { youtube: "UCtest123" } },
        headers: authHeaders(user.accessToken),
      });

      // Clear it by sending empty string
      const response = await request.put(`${API_URL}/users/me`, {
        data: { socialLinks: { youtube: "" } },
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.socialLinks?.youtube).toBeUndefined();
    });

    test("returns field-level validation errors for invalid input", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      const response = await request.put(`${API_URL}/users/me`, {
        data: { displayName: "X" }, // Too short (min 2)
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.details).toBeDefined();
      expect(body.details.length).toBeGreaterThan(0);
      expect(body.details[0].field).toBeDefined();
      expect(body.details[0].message).toBeDefined();
    });

    test("GET /users/me returns social links and privacy settings", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      // Update social links first
      await request.put(`${API_URL}/users/me`, {
        data: { socialLinks: { youtube: "UCtest456" } },
        headers: authHeaders(user.accessToken),
      });

      // GET should return them
      const response = await request.get(`${API_URL}/users/me`, {
        headers: authHeaders(user.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.socialLinks.youtube).toBe("UCtest456");
      expect(body.privacySettings).toBeDefined();
    });
  });

  test.describe("Get User Public Profile", () => {
    test("returns public profile fields", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/${user.id}`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.displayName).toBeDefined();
      expect(body.memberSince).toBeDefined();
      // Should NOT expose private fields
      expect(body.email).toBeUndefined();
      expect(body.trustTier).toBeUndefined();
      expect(body.privacySettings).toBeUndefined();
    });

    test("hides social links from anonymous when visibility is REGISTERED", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      // Set social links with REGISTERED visibility (default)
      await request.put(`${API_URL}/users/me`, {
        data: { socialLinks: { youtube: "UCprivate" } },
        headers: authHeaders(user.accessToken),
      });

      // Anonymous request should not see social links
      const response = await request.get(`${API_URL}/users/${user.id}`);
      const body = await response.json();
      expect(body.socialLinks).toBeUndefined();
    });

    test("shows social links to registered user when visibility is REGISTERED", async ({
      request,
    }) => {
      const user1 = await createTestUser(request);
      const user2 = await createTestUser(request);

      // User1 sets social links (default REGISTERED visibility)
      await request.put(`${API_URL}/users/me`, {
        data: { socialLinks: { youtube: "UCvisible" } },
        headers: authHeaders(user1.accessToken),
      });

      // User2 (registered) should see them
      const response = await request.get(`${API_URL}/users/${user1.id}`, {
        headers: authHeaders(user2.accessToken),
      });
      const body = await response.json();
      expect(body.socialLinks.youtube).toBe("UCvisible");
    });

    test("shows trustTier to authenticated viewer", async ({ request }) => {
      const user1 = await createTestUser(request);
      const user2 = await createTestUser(request);

      const response = await request.get(`${API_URL}/users/${user1.id}`, {
        headers: authHeaders(user2.accessToken),
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.trustTier).toBe("NEW");
    });

    test("returns 404 for non-existent user", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/users/00000000-0000-0000-0000-000000000099`,
      );
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Trust Tier Management", () => {
    test("requires authentication to update trust tier", async ({
      request,
    }) => {
      const response = await request.put(
        `${API_URL}/users/00000000-0000-0000-0000-000000000000/trust-tier`,
        {
          data: {
            trustTier: "TRUSTED",
          },
        },
      );

      expect([401, 403]).toContain(response.status());
    });

    test("requires admin role to update trust tier", async ({ request }) => {
      const user = await createTestUser(request);
      const targetUser = await createTestUser(request);

      const response = await request.put(
        `${API_URL}/users/${targetUser.id}/trust-tier`,
        {
          data: {
            trustTier: "TRUSTED",
            reason: "Test promotion",
          },
          headers: authHeaders(user.accessToken),
        },
      );

      // Regular users should get 403 Forbidden
      expect(response.status()).toBe(403);
    });
  });

  test.describe("Password Reset", () => {
    // TODO: Password reset endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip("accepts password reset request", async ({ request }) => {
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
    test.skip("accepts reset request for non-existent email", async ({
      request,
    }) => {
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
    test.skip("validates email format", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/password/reset`, {
        data: {
          email: "not-an-email",
        },
      });

      expect(response.status()).toBe(400);
    });

    // TODO: Password reset confirm endpoint not yet implemented
    // See: https://github.com/kelleyglenn/AcctAtlas-user-service/issues/25
    test.skip("rejects invalid reset token", async ({ request }) => {
      const response = await request.post(
        `${API_URL}/auth/password/reset/confirm`,
        {
          data: {
            token: "invalid-reset-token",
            newPassword: "NewSecurePass123!",
          },
        },
      );

      expect(response.status()).toBe(400);
    });
  });
});

import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  accessToken: string;
}

export interface TestLocation {
  id: string;
  displayName: string;
  coordinates: { latitude: number; longitude: number };
  city?: string;
  state?: string;
}

export interface TestVideo {
  id: string;
  youtubeId: string;
  title: string;
  status: string;
  amendments: string[];
  participants: string[];
}

/**
 * Create a test user and return credentials with access token
 */
export async function createTestUser(
  request: APIRequestContext,
  overrides: Partial<{ email: string; password: string; displayName: string }> = {}
): Promise<TestUser> {
  const userData = {
    email: `api-test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    displayName: 'API Test User',
    ...overrides,
  };

  const registerResponse = await request.post(`${API_URL}/auth/register`, {
    data: userData,
  });

  if (!registerResponse.ok()) {
    throw new Error(`Failed to register user: ${await registerResponse.text()}`);
  }

  const registerBody = await registerResponse.json();

  // Register returns both user and tokens, so we can use them directly
  return {
    id: registerBody.user.id,
    email: userData.email,
    password: userData.password,
    displayName: userData.displayName,
    accessToken: registerBody.tokens.accessToken,
  };
}

/**
 * Create a test location
 */
export async function createTestLocation(
  request: APIRequestContext,
  accessToken: string,
  overrides: Partial<{
    displayName: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  }> = {}
): Promise<TestLocation> {
  const locationData = {
    displayName: overrides.displayName || `Test Location ${Date.now()}`,
    coordinates: {
      latitude: overrides.latitude ?? 33.4484 + Math.random() * 0.01,
      longitude: overrides.longitude ?? -112.074 + Math.random() * 0.01,
    },
    city: overrides.city || 'Phoenix',
    state: overrides.state || 'AZ',
    country: 'USA',
  };

  const response = await request.post(`${API_URL}/locations`, {
    data: locationData,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create location: ${await response.text()}`);
  }

  const body = await response.json();
  return {
    id: body.id,
    displayName: body.displayName,
    coordinates: body.coordinates,
    city: body.city,
    state: body.state,
  };
}

/**
 * Helper to make authenticated requests
 */
export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Wait for a condition with polling
 */
export async function waitFor<T>(
  fn: () => Promise<T | null>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 10000, interval = 500 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await fn();
    if (result !== null) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

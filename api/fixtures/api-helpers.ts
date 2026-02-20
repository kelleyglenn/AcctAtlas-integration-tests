import { APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";

/** Base API URL - configurable via environment variable */
export const API_URL = process.env.API_URL || "http://localhost:8080/api/v1";

/** Base host for direct service access (health checks) */
export const SERVICE_HOST = process.env.SERVICE_HOST || "localhost";

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

/**
 * Create a test user and return credentials with access token
 */
export async function createTestUser(
  request: APIRequestContext,
  overrides: Partial<{
    email: string;
    password: string;
    displayName: string;
  }> = {},
): Promise<TestUser> {
  // Use timestamp + random suffix to avoid collisions when tests run in parallel
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const userData = {
    email: `api-test-${uniqueId}@example.com`,
    password: "TestPass123!",
    displayName: "API Test User",
    ...overrides,
  };

  const registerResponse = await request.post(`${API_URL}/auth/register`, {
    data: userData,
  });

  if (!registerResponse.ok()) {
    throw new Error(
      `Failed to register user: ${await registerResponse.text()}`,
    );
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
  }> = {},
): Promise<TestLocation> {
  const locationData = {
    displayName: overrides.displayName || `Test Location ${Date.now()}`,
    coordinates: {
      latitude: overrides.latitude ?? 33.4484 + Math.random() * 0.01,
      longitude: overrides.longitude ?? -112.074 + Math.random() * 0.01,
    },
    city: overrides.city || "Phoenix",
    state: overrides.state || "AZ",
    country: "USA",
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
    "Content-Type": "application/json",
  };
}

/** Postgres container name from docker-compose.yml */
const POSTGRES_CONTAINER =
  process.env.POSTGRES_CONTAINER || "accountabilityatlas-postgres-1";

/**
 * Delete test-created locations from the database by their IDs.
 * Cleans up both location_stats (FK) and locations tables.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deleteTestLocations(ids: string[]): void {
  if (ids.length === 0) return;
  if (!ids.every((id) => UUID_RE.test(id))) {
    throw new Error(`deleteTestLocations: invalid UUID in [${ids.join(", ")}]`);
  }
  const quoted = ids.map((id) => `'${id}'`).join(",");
  const sql = `DELETE FROM locations.location_stats WHERE location_id IN (${quoted}); DELETE FROM locations.locations WHERE id IN (${quoted});`;
  try {
    execSync(
      `docker exec ${POSTGRES_CONTAINER} psql -U location_service -d location_service -c "${sql}"`,
      {
        stdio: "pipe",
      },
    );
  } catch {
    // Cleanup is best-effort — don't fail the test suite
  }
}

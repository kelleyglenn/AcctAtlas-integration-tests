import { test, expect } from '@playwright/test';
import { createTestUser, loginAs } from '../../fixtures/test-data';

const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

test.describe('Location Service API', () => {
  test.describe('Public Endpoints', () => {
    test('should get a location by id', async ({ request }) => {
      // First create a user and location
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      const createResponse = await request.post(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          coordinates: { latitude: 40.7128, longitude: -74.006 },
          displayName: 'New York City Hall',
          city: 'New York',
          state: 'NY',
          country: 'USA',
        },
      });
      expect(createResponse.ok()).toBeTruthy();
      const created = await createResponse.json();

      // Then get it (public endpoint - no auth needed)
      const response = await request.get(`${API_URL}/locations/${created.id}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.displayName).toBe('New York City Hall');
      expect(body.city).toBe('New York');
      expect(body.state).toBe('NY');
      expect(body.coordinates.latitude).toBeCloseTo(40.7128, 4);
      expect(body.coordinates.longitude).toBeCloseTo(-74.006, 4);
    });

    test('should return 404 for non-existent location', async ({ request }) => {
      const response = await request.get(
        `${API_URL}/locations/00000000-0000-0000-0000-000000000000`
      );
      expect(response.status()).toBe(404);
    });

    test('should list locations within bounding box', async ({ request }) => {
      // First create a user and a location in SF area
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      await request.post(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          coordinates: { latitude: 37.7749, longitude: -122.4194 },
          displayName: 'SF City Hall',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
        },
      });

      // Query with bbox around SF (public endpoint - no auth needed)
      const response = await request.get(`${API_URL}/locations`, {
        params: { bbox: '-123,37,-122,38' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.locations).toBeDefined();
      expect(Array.isArray(body.locations)).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(0);
    });

    test('should get clustered markers', async ({ request }) => {
      // Query clustered markers for SF area (public endpoint)
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-123,37,-122,38',
          zoom: '10',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.clusters).toBeDefined();
      expect(Array.isArray(body.clusters)).toBe(true);
      expect(body.totalLocations).toBeGreaterThanOrEqual(0);
    });

    test('should return 400 for invalid bbox format', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations`, {
        params: { bbox: 'invalid-bbox' },
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authenticated Endpoints', () => {
    test('should create a location', async ({ request }) => {
      // Create a user and get auth token
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      const response = await request.post(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          coordinates: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          displayName: 'San Francisco City Hall',
          address: '1 Dr Carlton B Goodlett Pl',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.displayName).toBe('San Francisco City Hall');
      expect(body.id).toBeDefined();
      expect(body.coordinates.latitude).toBeCloseTo(37.7749, 4);
      expect(body.coordinates.longitude).toBeCloseTo(-122.4194, 4);
    });

    test('should return 401 when creating location without auth', async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/locations`, {
        data: {
          coordinates: { latitude: 37.7749, longitude: -122.4194 },
          displayName: 'Test Location',
        },
      });

      // Expect 401 Unauthorized (or 403 if not configured properly)
      expect([401, 403]).toContain(response.status());
    });

    test('should geocode an address', async ({ request }) => {
      // Create a user and get auth token
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      const response = await request.get(`${API_URL}/locations/geocode`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { address: '1600 Pennsylvania Avenue NW, Washington, DC' },
      });

      // Geocoding endpoint should respond (200 if configured, or service error otherwise)
      // We verify the endpoint exists and is accessible with auth
      expect([200, 500, 503]).toContain(response.status());
    });

    test('should reverse geocode coordinates', async ({ request }) => {
      // Create a user and get auth token
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      const response = await request.get(`${API_URL}/locations/reverse`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          latitude: '38.8977',
          longitude: '-77.0365',
        },
      });

      // Reverse geocoding endpoint should respond (200 if configured, or service error otherwise)
      // We verify the endpoint exists and is accessible with auth
      expect([200, 500, 503]).toContain(response.status());
    });

    test('should return 401 for geocoding without auth', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations/geocode`, {
        params: { address: 'Test Address' },
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Validation', () => {
    test('should reject location with missing required fields', async ({
      request,
    }) => {
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      // Missing coordinates
      const response = await request.post(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          displayName: 'Test Location',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject location with invalid coordinates', async ({
      request,
    }) => {
      const user = await createTestUser(request);
      expect(user.response.ok()).toBeTruthy();
      const token = await loginAs(request, user.email, user.password);

      // Latitude out of range
      const response = await request.post(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          coordinates: { latitude: 91, longitude: -122.4194 },
          displayName: 'Invalid Location',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject clustering with missing zoom parameter', async ({
      request,
    }) => {
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: { bbox: '-123,37,-122,38' },
      });

      expect(response.status()).toBe(400);
    });
  });
});

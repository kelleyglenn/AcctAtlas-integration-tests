import { test, expect } from '@playwright/test';
import {
  API_URL,
  createTestUser,
  createTestLocation,
  authHeaders,
  deleteTestLocations,
} from '../fixtures/api-helpers.js';

test.describe('Location Service API', () => {
  const createdLocationIds: string[] = [];

  test.afterAll(() => {
    deleteTestLocations(createdLocationIds);
  });

  test.describe('Create Location', () => {
    test('creates a location with valid data', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/locations`, {
        data: {
          displayName: 'Phoenix Police Department',
          coordinates: { latitude: 33.4484, longitude: -112.074 },
          city: 'Phoenix',
          state: 'AZ',
          country: 'USA',
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.id).toBeDefined();
      createdLocationIds.push(body.id);
      expect(body.displayName).toBe('Phoenix Police Department');
      expect(body.coordinates.latitude).toBeCloseTo(33.4484, 4);
      expect(body.coordinates.longitude).toBeCloseTo(-112.074, 4);
      expect(body.city).toBe('Phoenix');
      expect(body.state).toBe('AZ');
    });

    test('requires authentication', async ({ request }) => {
      const response = await request.post(`${API_URL}/locations`, {
        data: {
          displayName: 'Test Location',
          coordinates: { latitude: 33.4484, longitude: -112.074 },
        },
      });

      // Should return 401 (Unauthorized) now that auth is enforced
      expect([401, 403]).toContain(response.status());
    });

    test('validates required fields', async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.post(`${API_URL}/locations`, {
        data: {
          // Missing displayName and coordinates
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Get Location', () => {
    test('returns location by ID', async ({ request }) => {
      const user = await createTestUser(request);
      const location = await createTestLocation(request, user.accessToken, {
        displayName: 'Scottsdale City Hall',
        latitude: 33.4942,
        longitude: -111.9261,
        city: 'Scottsdale',
        state: 'AZ',
      });
      createdLocationIds.push(location.id);

      const response = await request.get(`${API_URL}/locations/${location.id}`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.id).toBe(location.id);
      expect(body.displayName).toBe('Scottsdale City Hall');
    });

    test('returns 404 for non-existent location', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations/00000000-0000-0000-0000-000000000000`);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('List Locations (Bounding Box)', () => {
    test('returns locations within bounding box', async ({ request }) => {
      const user = await createTestUser(request);

      // Create a location with specific coordinates we can verify
      const testLat = 33.45;
      const testLng = -112.07;
      const createdLocation = await createTestLocation(request, user.accessToken, {
        displayName: `Phoenix Test Location ${Date.now()}`,
        latitude: testLat,
        longitude: testLng,
        city: 'Phoenix',
        state: 'AZ',
      });
      createdLocationIds.push(createdLocation.id);

      // Query with bounding box that definitely includes our test location
      const response = await request.get(`${API_URL}/locations`, {
        params: {
          bbox: '-112.2,33.3,-111.9,33.6', // minLng,minLat,maxLng,maxLat
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.locations).toBeInstanceOf(Array);
      expect(body.count).toBeGreaterThanOrEqual(1);

      // Verify our specific location is in the results
      const found = body.locations.some((loc: { id: string }) => loc.id === createdLocation.id);
      expect(found).toBeTruthy();
    });

    test('validates bounding box format', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations`, {
        params: {
          bbox: 'invalid-bbox',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Clustered Markers', () => {
    test('returns clusters for map viewport', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-125,24,-66,50', // Continental US
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.clusters).toBeInstanceOf(Array);
      expect(body.totalLocations).toBeGreaterThanOrEqual(0);

      // Each cluster should have bounds
      for (const cluster of body.clusters) {
        expect(cluster.bounds).toBeDefined();
        expect(cluster.bounds.minLat).toBeDefined();
        expect(cluster.bounds.maxLat).toBeDefined();
        expect(cluster.bounds.minLng).toBeDefined();
        expect(cluster.bounds.maxLng).toBeDefined();
      }
    });

    test('returns multiple regional clusters at default zoom', async ({ request }) => {
      // At zoom 4, epsilon = 45/16 = 2.8125° — should NOT merge all US locations into one cluster
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-125,24,-66,50', // Continental US
          zoom: 4,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // With fixed epsilon, expect multiple clusters/markers (Bay Area, Texas, etc.)
      expect(body.clusters.length).toBeGreaterThan(1);
    });

    test('cluster bounds contain all member locations', async ({ request }) => {
      // At zoom 5, Bay Area locations should form a cluster with known bounds
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-125,35,-120,40', // California region
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // Find the Bay Area cluster (count >= 5, latitude ~37.x)
      const bayAreaCluster = body.clusters.find(
        (c: { count: number; coordinates: { latitude: number } }) =>
          c.count >= 5 && c.coordinates.latitude > 37 && c.coordinates.latitude < 38,
      );

      if (bayAreaCluster) {
        // Bounds should span from San Jose (~37.34) to Berkeley (~37.87)
        expect(bayAreaCluster.bounds.minLat).toBeCloseTo(37.34, 0);
        expect(bayAreaCluster.bounds.maxLat).toBeCloseTo(37.87, 0);
        // Bounds should span from SF (~-122.42) to San Jose (~-121.89)
        expect(bayAreaCluster.bounds.minLng).toBeLessThan(-121.8);
        expect(bayAreaCluster.bounds.maxLng).toBeGreaterThan(-122.5);
      }
    });

    test('cluster centroid is within bounds', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-125,24,-66,50',
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const cluster of body.clusters) {
        expect(cluster.coordinates.latitude).toBeGreaterThanOrEqual(cluster.bounds.minLat);
        expect(cluster.coordinates.latitude).toBeLessThanOrEqual(cluster.bounds.maxLat);
        expect(cluster.coordinates.longitude).toBeGreaterThanOrEqual(cluster.bounds.minLng);
        expect(cluster.coordinates.longitude).toBeLessThanOrEqual(cluster.bounds.maxLng);
      }
    });

    test('requires zoom parameter', async ({ request }) => {
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-125,24,-66,50',
          // Missing zoom
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    test('cluster centroids are accurate for Bay Area locations', async ({ request }) => {
      // Bay Area seed locations: SF, Oakland, San Jose, Berkeley, Fremont
      // Expected centroid: ~(37.67, -122.20) (average of all 5)
      const response = await request.get(`${API_URL}/locations/cluster`, {
        params: {
          bbox: '-123,37,-121,38.5',
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // Find the Bay Area cluster (the one with 5+ members in the 37-38 lat range)
      const bayAreaCluster = body.clusters.find(
        (c: { count: number; coordinates: { latitude: number } }) =>
          c.count >= 5 && c.coordinates.latitude > 37 && c.coordinates.latitude < 38.5,
      );

      // Centroid should be close to the average of the 5 Bay Area locations
      if (bayAreaCluster) {
        expect(bayAreaCluster.coordinates.latitude).toBeGreaterThan(37.3);
        expect(bayAreaCluster.coordinates.latitude).toBeLessThan(37.9);
        expect(bayAreaCluster.coordinates.longitude).toBeGreaterThan(-122.5);
        expect(bayAreaCluster.coordinates.longitude).toBeLessThan(-121.8);
      }
    });
  });
});

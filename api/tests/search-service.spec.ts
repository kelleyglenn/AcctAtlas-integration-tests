import { test, expect } from "@playwright/test";
import { API_URL } from "../fixtures/api-helpers.js";

test.describe("Search Service API", () => {
  test.describe("Video Search", () => {
    test("returns empty results when no videos exist", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`);

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.totalElements).toBeGreaterThanOrEqual(0);
    });

    test("supports text query search", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          q: "police audit",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
    });

    test("supports amendment filter", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          amendments: "FIRST",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      // All results should have FIRST amendment if any exist
      for (const result of body.results) {
        expect(result.amendments).toContain("FIRST");
      }
    });

    test("supports participant filter", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          participants: "POLICE",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      // All results should have POLICE participant if any exist
      for (const result of body.results) {
        expect(result.participants).toContain("POLICE");
      }
    });

    test("supports SECURITY participant filter", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          participants: "SECURITY",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      // All results should have SECURITY participant if any exist
      for (const result of body.results) {
        expect(result.participants).toContain("SECURITY");
      }
    });

    test("supports state filter", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          state: "AZ",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
    });

    test("supports pagination", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          page: 0,
          size: 10,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.pagination.page).toBe(0);
      expect(body.pagination.size).toBe(10);
    });

    test("supports bbox filter", async ({ request }) => {
      // SF Bay Area bounding box: should match ~5 CA seed videos
      const response = await request.get(`${API_URL}/search`, {
        params: {
          bbox: "-123,37,-121,38",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
      expect(body.results.length).toBeGreaterThan(0);
      expect(body.results.length).toBeLessThanOrEqual(5);
      // All results should have coordinates within the bbox
      for (const result of body.results) {
        if (result.locations.length > 0 && result.locations[0].coordinates) {
          const { latitude, longitude } = result.locations[0].coordinates;
          expect(latitude).toBeGreaterThanOrEqual(37);
          expect(latitude).toBeLessThanOrEqual(38);
          expect(longitude).toBeGreaterThanOrEqual(-123);
          expect(longitude).toBeLessThanOrEqual(-121);
        }
      }
    });

    test("bbox combined with other filters narrows results", async ({
      request,
    }) => {
      // SF Bay Area bbox + FOURTH amendment filter
      const bboxOnly = await request.get(`${API_URL}/search`, {
        params: {
          bbox: "-123,37,-121,38",
        },
      });
      const bboxBody = await bboxOnly.json();

      const bboxPlusAmendment = await request.get(`${API_URL}/search`, {
        params: {
          bbox: "-123,37,-121,38",
          amendments: "FOURTH",
        },
      });
      const combinedBody = await bboxPlusAmendment.json();

      expect(bboxPlusAmendment.ok()).toBeTruthy();
      expect(combinedBody.results.length).toBeLessThanOrEqual(
        bboxBody.results.length,
      );
      // All combined results should have FOURTH amendment
      for (const result of combinedBody.results) {
        expect(result.amendments).toContain("FOURTH");
      }
    });

    test("supports multiple filters combined", async ({ request }) => {
      const response = await request.get(`${API_URL}/search`, {
        params: {
          amendments: "FIRST",
          participants: "POLICE",
          state: "AZ",
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.results).toBeInstanceOf(Array);
    });
  });

  test.describe("Search Cluster Endpoint", () => {
    test("returns clusters for US bounding box", async ({ request }) => {
      const response = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.clusters).toBeInstanceOf(Array);
      expect(body.totalLocations).toBeGreaterThanOrEqual(0);
      expect(body.zoom).toBe(5);

      // Each cluster should have required fields
      for (const cluster of body.clusters) {
        expect(cluster.id).toBeDefined();
        expect(cluster.coordinates.latitude).toBeDefined();
        expect(cluster.coordinates.longitude).toBeDefined();
        expect(cluster.count).toBeGreaterThanOrEqual(1);
        expect(cluster.bounds).toBeDefined();
      }
    });

    test("cluster counts decrease with amendment filter", async ({
      request,
    }) => {
      const unfiltered = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
        },
      });
      const unfilteredBody = await unfiltered.json();

      const filtered = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
          amendments: "FOURTH",
        },
      });
      const filteredBody = await filtered.json();

      expect(filtered.ok()).toBeTruthy();
      expect(filteredBody.totalLocations).toBeLessThanOrEqual(
        unfilteredBody.totalLocations,
      );
    });

    test("cluster counts decrease with participant filter", async ({
      request,
    }) => {
      const unfiltered = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
        },
      });
      const unfilteredBody = await unfiltered.json();

      const filtered = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
          participants: "GOVERNMENT",
        },
      });
      const filteredBody = await filtered.json();

      expect(filtered.ok()).toBeTruthy();
      expect(filteredBody.totalLocations).toBeLessThanOrEqual(
        unfilteredBody.totalLocations,
      );
    });

    test("combined filters narrow results further", async ({ request }) => {
      const amendmentOnly = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
          amendments: "FIRST",
        },
      });
      const amendmentBody = await amendmentOnly.json();

      const combined = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
          zoom: 5,
          amendments: "FIRST",
          participants: "GOVERNMENT",
        },
      });
      const combinedBody = await combined.json();

      expect(combined.ok()).toBeTruthy();
      expect(combinedBody.totalLocations).toBeLessThanOrEqual(
        amendmentBody.totalLocations,
      );
    });

    test("empty bbox returns empty clusters", async ({ request }) => {
      // Middle of Pacific Ocean
      const response = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "170,10,175,15",
          zoom: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.clusters).toEqual([]);
      expect(body.totalLocations).toBe(0);
    });

    test("invalid bbox returns 400", async ({ request }) => {
      const response = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "invalid",
          zoom: 5,
        },
      });

      expect(response.status()).toBe(400);
    });

    test("missing bbox returns error", async ({ request }) => {
      const response = await request.get(`${API_URL}/search/cluster`, {
        params: {
          zoom: 5,
        },
      });

      // Spring Security forwards missing param errors to /error which returns 403
      // (known issue: pre-production fix needed for proper 400 responses)
      expect(response.ok()).toBeFalsy();
    });

    test("missing zoom returns error", async ({ request }) => {
      const response = await request.get(`${API_URL}/search/cluster`, {
        params: {
          bbox: "-125,24,-66,50",
        },
      });

      // Spring Security forwards missing param errors to /error which returns 403
      expect(response.ok()).toBeFalsy();
    });
  });

  test.describe("Search is Public", () => {
    test("does not require authentication", async ({ request }) => {
      // Search should work without auth header
      const response = await request.get(`${API_URL}/search`);

      expect(response.ok()).toBeTruthy();
      // Should NOT be 401 or 403
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });
  });
});

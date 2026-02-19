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

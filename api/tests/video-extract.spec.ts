import { test, expect } from "@playwright/test";
import {
  API_URL,
  createTestUser,
  authHeaders,
} from "../fixtures/api-helpers.js";

test.describe("Video Metadata Extraction", () => {
  test.describe("Boundary Tests", () => {
    test("extract without auth returns 401/403", async ({ request }) => {
      const response = await request.get(`${API_URL}/videos/extract`, {
        params: {
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test("extract with invalid URL returns 400", async ({ request }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/videos/extract`, {
        params: { youtubeUrl: "not-a-valid-url" },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(400);
    });

    test("extract with unavailable video returns 422", async ({ request }) => {
      const user = await createTestUser(request);

      // Use a video ID that looks valid but doesn't exist
      const response = await request.get(`${API_URL}/videos/extract`, {
        params: {
          youtubeUrl: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
        },
        headers: authHeaders(user.accessToken),
      });

      expect(response.status()).toBe(422);
    });
  });

  test.describe("Real Extraction", () => {
    test("extract with valid URL returns valid extraction shape", async ({
      request,
    }) => {
      const user = await createTestUser(request);

      const response = await request.get(`${API_URL}/videos/extract`, {
        params: {
          // Known seed video: "1ST AMENDMENT AUDIT FEDEX PALM SPRINGS"
          youtubeUrl: "https://www.youtube.com/watch?v=RngL8_3k0C0",
        },
        headers: authHeaders(user.accessToken),
      });

      expect(
        response.status(),
        `Expected 2xx but got ${response.status()}: ${await response.text()}`,
      ).toBe(200);
      const body = await response.json();

      // Validate response shape — do NOT assert specific values (non-deterministic)
      expect(body.amendments).toBeDefined();
      expect(Array.isArray(body.amendments)).toBe(true);

      expect(body.participants).toBeDefined();
      expect(Array.isArray(body.participants)).toBe(true);

      // Validate enum values
      const validAmendments = [
        "FIRST",
        "SECOND",
        "FOURTH",
        "FIFTH",
        "FOURTEENTH",
      ];
      for (const amendment of body.amendments) {
        expect(validAmendments).toContain(amendment);
      }

      const validParticipants = [
        "POLICE",
        "GOVERNMENT",
        "BUSINESS",
        "CITIZEN",
        "SECURITY",
      ];
      for (const participant of body.participants) {
        expect(validParticipants).toContain(participant);
      }

      // Confidence scores
      expect(body.confidence).toBeDefined();
      if (body.confidence) {
        for (const key of [
          "amendments",
          "participants",
          "videoDate",
          "location",
        ]) {
          if (body.confidence[key] != null) {
            expect(body.confidence[key]).toBeGreaterThanOrEqual(0);
            expect(body.confidence[key]).toBeLessThanOrEqual(1);
          }
        }
      }

      // videoDate is either null or a valid date string
      if (body.videoDate != null) {
        expect(body.videoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      // location is either null or an object with expected fields
      if (body.location != null) {
        expect(typeof body.location).toBe("object");
      }
    });
  });
});

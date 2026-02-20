import { test, expect } from "@playwright/test";
import { API_URL, authHeaders } from "../fixtures/api-helpers.js";

test.describe("Trusted User Auto-Approval", () => {
  test("video submitted by trusted user is auto-approved", async ({
    request,
  }) => {
    // 1. Login as the seed trusted user
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { email: "trusted@example.com", password: "password123" },
    });

    if (!loginRes.ok()) {
      test.skip(true, "Trusted seed user not available");
      return;
    }

    const loginBody = await loginRes.json();
    const accessToken = loginBody.tokens.accessToken;

    // 2. Create a test location
    const locationRes = await request.post(`${API_URL}/locations`, {
      data: {
        displayName: `API Auto-Approval Location ${Date.now()}`,
        coordinates: { latitude: 40.7128, longitude: -74.006 },
        city: "New York",
        state: "NY",
        country: "USA",
      },
      headers: authHeaders(accessToken),
    });
    expect(locationRes.ok()).toBeTruthy();
    const location = await locationRes.json();

    // 3. Submit a video as the TRUSTED user
    //    Retry to handle race conditions when parallel tests submit
    //    the same URL concurrently.
    let videoId = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const createRes = await request.post(`${API_URL}/videos`, {
        data: {
          youtubeUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
          amendments: ["FIRST"],
          participants: ["POLICE"],
          locationId: location.id,
        },
        headers: authHeaders(accessToken),
      });

      if (createRes.ok()) {
        videoId = (await createRes.json()).id;
        break;
      } else if (createRes.status() === 409) {
        const userVideosRes = await request.get(
          `${API_URL}/videos/user/${loginBody.user.id}?status=APPROVED`,
          { headers: authHeaders(accessToken) },
        );
        expect(userVideosRes.ok()).toBeTruthy();
        const userVideos = await userVideosRes.json();
        expect(userVideos.content.length).toBeGreaterThan(0);
        videoId = userVideos.content[0].id;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(videoId).toBeTruthy();

    // 4. Wait for auto-approval (async via SQS)
    let approved = false;
    let videoTitle = "";
    for (let i = 0; i < 10; i++) {
      const detailRes = await request.get(`${API_URL}/videos/${videoId}`, {
        headers: authHeaders(accessToken),
      });
      if (detailRes.ok()) {
        const detail = await detailRes.json();
        videoTitle = detail.title;
        if (detail.status === "APPROVED") {
          approved = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(approved).toBe(true);
    expect(videoTitle).toBeTruthy();

    // 5. Verify search service indexes the video
    await expect(async () => {
      const searchRes = await request.get(`${API_URL}/search`, {
        params: { q: videoTitle },
      });
      expect(searchRes.ok()).toBeTruthy();
      const searchBody = await searchRes.json();
      const found = searchBody.results.some(
        (r: { id: string }) => r.id === videoId,
      );
      expect(found).toBe(true);
    }).toPass({ timeout: 60_000, intervals: [2000] });
  });
});

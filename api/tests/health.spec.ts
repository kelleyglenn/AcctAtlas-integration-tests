import { test, expect } from "@playwright/test";
import { SERVICE_HOST } from "../fixtures/api-helpers.js";

const SERVICES = [
  { name: "api-gateway", port: 8080 },
  { name: "user-service", port: 8081 },
  { name: "video-service", port: 8082 },
  { name: "location-service", port: 8083 },
  { name: "search-service", port: 8084 },
  { name: "moderation-service", port: 8085 },
];

test.describe("Service Health Checks", () => {
  for (const service of SERVICES) {
    test(`${service.name} is healthy`, async ({ request }) => {
      const response = await request.get(
        `http://${SERVICE_HOST}:${service.port}/actuator/health`,
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.status).toBe("UP");
    });
  }
});

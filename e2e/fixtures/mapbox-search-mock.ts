import { Page } from "@playwright/test";

interface MockLocation {
  name: string;
  placeFormatted: string;
  coordinates: [number, number]; // [lng, lat]
}

const MOCK_LOCATIONS: Record<string, MockLocation> = {
  denver: {
    name: "Denver",
    placeFormatted: "Colorado, United States",
    coordinates: [-104.9903, 39.7392],
  },
  "san antonio": {
    name: "San Antonio",
    placeFormatted: "Texas, United States",
    coordinates: [-98.4936, 29.4241],
  },
};

function findMockLocation(query: string): MockLocation {
  const key = query.toLowerCase();
  return (
    MOCK_LOCATIONS[key] ?? {
      name: query,
      placeFormatted: "United States",
      coordinates: [-98.5795, 39.8283],
    }
  );
}

/**
 * Intercept Mapbox Search Box API calls so E2E tests don't consume
 * real search sessions (free tier = 500/month).
 *
 * Call this before page.goto() in any test that types into the SearchBox.
 */
export async function mockMapboxSearchAPI(page: Page): Promise<void> {
  // Intercept suggest requests
  await page.route("**/search/searchbox/v1/suggest**", (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    const location = findMockLocation(query);
    const mapboxId = location.name.toLowerCase().replace(/\s+/g, "-");

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            name: location.name,
            mapbox_id: mapboxId,
            feature_type: "place",
            place_formatted: location.placeFormatted,
            address: "",
            full_address: `${location.name}, ${location.placeFormatted}`,
            language: "en",
            maki: "marker",
            context: {},
          },
        ],
        attribution: "mocked",
      }),
    });
  });

  // Intercept retrieve requests
  await page.route("**/search/searchbox/v1/retrieve/**", (route) => {
    const url = new URL(route.request().url());
    // mapbox_id is the last path segment (URL-encoded)
    const pathParts = url.pathname.split("/");
    const mapboxId = decodeURIComponent(pathParts[pathParts.length - 1]);
    const key = mapboxId.replace(/-/g, " ");
    const location = findMockLocation(key);

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: location.coordinates,
            },
            properties: {
              name: location.name,
              place_formatted: location.placeFormatted,
              coordinates: {
                longitude: location.coordinates[0],
                latitude: location.coordinates[1],
              },
            },
          },
        ],
        attribution: "mocked",
      }),
    });
  });
}

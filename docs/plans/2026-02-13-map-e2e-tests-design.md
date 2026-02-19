# Map Feature E2E Tests Design

## Overview

Browser-based E2E tests for the web-app map feature using Playwright. Tests validate user journeys for browsing videos on the interactive map, filtering, searching locations, and viewing video details.

## Test File Structure

```
e2e/tests/
├── auth/
│   └── login.spec.ts         # existing
├── map/
│   └── map-browse.spec.ts    # NEW: map browsing journeys
└── videos/
    └── video-detail.spec.ts  # NEW: video detail page
```

## Test Data

Tests use the existing dev seed data (10 videos across US locations). No API mutations needed - all tests are read-only browse operations.

**Seed data fixture:** `e2e/fixtures/seed-data.ts`

```typescript
export const SEED_VIDEOS = {
  SF_FIRST_AMENDMENT: {
    id: "10000000-0000-0000-0000-000000000001",
    title: "Northern California Government Building Audit",
    amendments: ["FIRST"],
    participants: ["POLICE", "GOVERNMENT"],
    city: "San Francisco",
  },
  OAKLAND_MULTI_AMENDMENT: {
    id: "10000000-0000-0000-0000-000000000002",
    title: "East Lansing Police Department Audit Analysis",
    amendments: ["FIRST", "FOURTH"],
    participants: ["POLICE"],
    city: "Oakland",
  },
  SAN_ANTONIO_BUSINESS: {
    id: "10000000-0000-0000-0000-000000000006",
    title: "San Antonio Strip Mall Encounter",
    amendments: ["FIRST"],
    participants: ["POLICE", "BUSINESS"],
    city: "San Antonio",
  },
} as const;

export const NON_EXISTENT_VIDEO_ID = "00000000-0000-0000-0000-000000000000";
```

## Test Cases

### Map Browse Tests (`e2e/tests/map/map-browse.spec.ts`)

| Test                                              | Description                                                   |
| ------------------------------------------------- | ------------------------------------------------------------- |
| map page loads with video markers                 | Navigate to /map, verify markers with `data-video-id` appear  |
| clicking marker shows video info popup            | Click marker, verify popup with title and "View Video" button |
| clicking "View Video" navigates to detail page    | From popup, click button, verify URL `/videos/[id]`           |
| filter by amendment updates video list            | Toggle "1st Amendment" chip, verify list filters              |
| filter by participant updates video list          | Toggle "Police" chip, verify list filters                     |
| location search flies to location and shows toast | Search city, verify toast "Moved to..."                       |
| clicking video in list shows marker popup         | Click VideoListItem, verify popup appears                     |

### Video Detail Tests (`e2e/tests/videos/video-detail.spec.ts`)

| Test                                         | Description                                                         |
| -------------------------------------------- | ------------------------------------------------------------------- |
| video detail page shows video information    | Navigate to `/videos/[id]`, verify title, YouTube embed, amendments |
| video detail page shows location information | Verify location name, city, state                                   |
| back button returns to previous page         | From /map to /videos/[id], click back, verify /map                  |
| "Watch on YouTube" link has correct URL      | Verify href contains YouTube video ID                               |
| "Back to Map" button navigates to map        | Click button, verify URL /map                                       |
| shows error for non-existent video           | Navigate to invalid ID, verify "Video not found"                    |

## Locator Strategy

Following existing patterns from `login.spec.ts`:

| Element          | Locator                                               |
| ---------------- | ----------------------------------------------------- |
| Video markers    | `page.locator('[data-video-id]')`                     |
| Filter chips     | `page.getByRole('button', { name: '1st Amendment' })` |
| Video list items | `page.getByRole('listitem')` or title text            |
| Location search  | `page.getByRole('searchbox')` or placeholder          |
| Toast messages   | `page.getByText(/Moved to/i)`                         |
| Popup buttons    | `page.getByRole('button', { name: /View Video/i })`   |
| YouTube embed    | `page.locator('iframe[src*="youtube"]')`              |

## Browser Considerations

- WebKit may need `waitForTimeout()` for map rendering (similar to login form)
- Map markers render asynchronously - use `waitFor` assertions
- Mapbox GL requires WebGL - tests may need headed mode or specific flags

## Implementation Steps

1. Create `e2e/fixtures/seed-data.ts` with video constants
2. Create `e2e/tests/map/map-browse.spec.ts` with 7 tests
3. Create `e2e/tests/videos/video-detail.spec.ts` with 6 tests
4. Run tests with full stack: `npm run test:e2e`
5. Adjust timeouts/waits as needed for map rendering

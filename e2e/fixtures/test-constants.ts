// e2e/fixtures/test-constants.ts

/**
 * Test timeout constants for E2E tests.
 * These account for backend response times and WebGL map rendering.
 */

/** Timeout for initial page/data load (map markers, video list, etc.) */
export const PAGE_LOAD_TIMEOUT = 15000;

/** Timeout for UI interactions (popups, toasts, navigation) */
export const UI_INTERACTION_TIMEOUT = 5000;

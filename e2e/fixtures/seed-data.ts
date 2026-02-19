// e2e/fixtures/seed-data.ts

/**
 * Known video IDs from dev seed data (search-service).
 * These match UUIDs in R__dev_seed_search_videos.sql.
 * Used for deterministic E2E tests without API setup.
 */
export const SEED_VIDEOS = {
  SF_FIRST_AMENDMENT: {
    id: '10000000-0000-0000-0000-000000000001',
    youtubeId: 'RngL8_3k0C0',
    title: 'Northern California Government Building Audit',
    amendments: ['FIRST'],
    participants: ['POLICE', 'GOVERNMENT'],
    city: 'San Francisco',
    state: 'CA',
    lat: 37.7793,
    lng: -122.4193,
  },
  OAKLAND_MULTI_AMENDMENT: {
    id: '10000000-0000-0000-0000-000000000002',
    youtubeId: 'nQRpazbSRf4',
    title: 'East Lansing Police Department Audit Analysis',
    amendments: ['FIRST', 'FOURTH'],
    participants: ['POLICE'],
    city: 'Oakland',
    state: 'CA',
  },
  SAN_ANTONIO_BUSINESS: {
    id: '10000000-0000-0000-0000-000000000006',
    youtubeId: '-kNacBPsNxo',
    title: 'San Antonio Strip Mall Encounter',
    amendments: ['FIRST'],
    participants: ['POLICE', 'BUSINESS'],
    city: 'San Antonio',
    state: 'TX',
  },
  SILVERTHORNE_GOVERNMENT: {
    id: '10000000-0000-0000-0000-000000000008',
    youtubeId: 'hkhrXPur4ws',
    title: 'Silverthorne Post Office Audit',
    amendments: ['FIRST'],
    participants: ['GOVERNMENT'],
    city: 'Silverthorne',
    state: 'CO',
  },
} as const;

/** Known user IDs from dev seed data */
export const SEED_USERS = {
  /** "Trusted User" who submitted all 10 seed videos (8 approved, 2 rejected) */
  TRUSTED_SUBMITTER: {
    id: '00000000-0000-0000-0000-000000000003',
    displayName: 'Trusted User',
    trustTier: 'TRUSTED',
  },
} as const;

/** Non-existent ID for 404 tests */
export const NON_EXISTENT_VIDEO_ID = '00000000-0000-0000-0000-000000000000';

/** Total count of seed videos */
export const SEED_VIDEO_COUNT = 10;

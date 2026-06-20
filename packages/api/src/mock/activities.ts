import type { ActivitySlug } from '@pacergo/shared';

/** Active activities are launched; others are seeded but not yet enabled. */
export const MOCK_ACTIVITIES: { slug: ActivitySlug; is_active: boolean }[] = [
  { slug: 'gym', is_active: true },
  { slug: 'running', is_active: true },
  { slug: 'hiking', is_active: true },
  { slug: 'cycling', is_active: false },
  { slug: 'yoga', is_active: false },
  { slug: 'swimming', is_active: false },
  { slug: 'boxing', is_active: false },
  { slug: 'basketball', is_active: false },
];

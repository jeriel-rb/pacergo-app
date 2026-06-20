import type { ActivitySlug } from '@pacergo/shared';
import { USE_MOCK } from '../supabase-client';
import { MOCK_ACTIVITIES } from '../mock/activities';

export async function getActivities(): Promise<
  { slug: ActivitySlug; is_active: boolean }[]
> {
  if (USE_MOCK) return MOCK_ACTIVITIES;
  throw new Error('Supabase activities query not implemented yet');
}

import type { ActivitySlug } from "@pacergo/shared";
import { MOCK_ACTIVITIES } from "../mock/activities";

/**
 * Activity taxonomy. This is public reference data (not user-specific), so it's
 * served from the static list in both mock and live modes.
 */
export async function getActivities(): Promise<
  { slug: ActivitySlug; is_active: boolean }[]
> {
  return MOCK_ACTIVITIES;
}

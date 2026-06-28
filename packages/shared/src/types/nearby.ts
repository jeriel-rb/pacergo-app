import type { Tier } from "../enums/tier";
import type { ActivitySlug } from "../enums/activity";
import type { ExperienceLevel } from "../enums/experience";

/** A nearby companion from the nearby_companions RPC. Privacy-preserving:
 *  exposes distance, never raw coordinates. */
export interface NearbyCompanion {
  companion_id: string;
  display_name: string;
  photo_url: string | null;
  experience_level: ExperienceLevel | null;
  home_area: string | null;
  tier: Tier | null;
  activity_slug: ActivitySlug | null;
  price_ntd: number;
  is_free: boolean;
  distance_m: number;
}

// Tier is defined once in @pacergo/shared; re-exported here so existing
// mobile imports keep working.
export type { Tier } from '@pacergo/shared';
import type { Tier } from '@pacergo/shared';

export type NearbyCompanion = {
  companion_id: string;
  display_name: string | null;
  photo_url: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  home_area: string | null;
  tier: Tier;
  activity_slug: string;
  price_ntd: number;
  is_free: boolean;
  distance_m: number;
};

export type Coords = { lat: number; lng: number };

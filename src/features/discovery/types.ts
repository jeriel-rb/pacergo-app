export type Tier = 'A' | 'B' | 'C';

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

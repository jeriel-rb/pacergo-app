import type { Coords, Tier } from './types';

export type NearbyFilters = {
  activitySlug: string | null;
  tier: Tier | null;
  maxPrice: number | null;
  radiusM: number;
};

export function buildNearbyParams(center: Coords, filters: NearbyFilters) {
  return {
    center_lat: center.lat,
    center_lng: center.lng,
    radius_m: filters.radiusM,
    filter_activity: filters.activitySlug,
    filter_tier: filters.tier,
    max_price: filters.maxPrice,
  };
}

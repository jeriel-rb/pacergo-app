import type { Tier } from '@pacergo/shared';

export type Listing = {
  id: string;
  user_id?: string;
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
  rating_avg: number;
  rating_count: number;
};

export type OfferingDraft = {
  activity_id: string;
  /** Needed by the `add_offering` RPC (keyed by slug, not id). */
  activity_slug: string;
  tier: Tier;
  price_ntd: number;
  session_minutes: number;
};

export type AvailabilitySlot = {
  id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/** Per-activity verification status map from my_listing() (keyed by slug). */
export type VerificationMap = Record<
  string,
  { status: VerificationStatus; label: string | null } | undefined
>;

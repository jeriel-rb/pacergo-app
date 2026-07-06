import type { Tier } from '@/features/discovery/types';

export type Listing = {
  id: string;
  user_id: string;
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

export type Verification = {
  id: string;
  doc_type: 'certification' | 'id';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

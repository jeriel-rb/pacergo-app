import type { Tier } from '@/features/discovery/types';

export type Listing = {
  id: string;
  profile_id: string;
  headline: string | null;
  bio_long: string | null;
  served_area: string | null;
  status: 'draft' | 'active' | 'paused';
  rating_avg: number;
  rating_count: number;
};

export type OfferingDraft = {
  activity_id: string;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
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

import type { BookingStatus } from './stateMachine';
import type { Tier } from '@/features/discovery/types';

export type Booking = {
  id: string;
  seeker_id: string;
  companion_id: string;
  offering_id: string | null;
  activity_slug: string | null;
  tier: Tier | null;
  status: BookingStatus;
  scheduled_start: string | null;
  duration_min: number;
  location_name: string | null;
  agreed_price: number;
  is_free: boolean;
  seeker_note: string | null;
  seeker_name: string | null;
  seeker_photo: string | null;
  companion_name: string | null;
  companion_photo: string | null;
  created_at: string;
};

/** Input for the `create_booking` RPC — activity/tier/price and both
 *  parties' names are snapshotted server-side from the offering. */
export type NewBooking = {
  companion_id: string;
  offering_id: string;
  scheduled_start: string | null;
  duration_min: number | null;
  location_name: string | null;
  seeker_note: string | null;
};

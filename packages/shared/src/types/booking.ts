import type { Tier } from '../enums/tier';
import type { BookingStatus } from '../enums/booking';
import type { ActivitySlug } from '../enums/activity';

export interface Booking {
  id: string;
  trainer_id: string;
  activity: ActivitySlug | null;
  tier: Tier | null;
  status: BookingStatus;
  scheduled_start: string | null;
  duration_min: number;
  agreed_price: number;
  is_free: boolean;
  created_at: string;
}

/** A booking row as returned by my_bookings / booking_detail RPCs. Mirrors the
 *  `bookings` table (denormalized names/photos for display without a join). */
export interface BookingRecord {
  id: string;
  seeker_id: string;
  companion_id: string;
  offering_id: string | null;
  activity_slug: ActivitySlug | null;
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
  completed_at: string | null;
  created_at: string;
}

/** A bookable offering (with its id) from companion_offerings. */
export interface CompanionOffering {
  id: string;
  activity: ActivitySlug;
  tier: Tier;
  price_ntd: number;
  is_free: boolean;
  session_minutes: number;
}

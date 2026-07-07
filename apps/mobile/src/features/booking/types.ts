import type { BookingRecord } from '@pacergo/shared';

/** A booking row (shared shape, returned by my_bookings / booking_detail). */
export type Booking = BookingRecord;

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

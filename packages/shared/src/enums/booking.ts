export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'expired';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'requested',
  'accepted',
  'declined',
  'cancelled',
  'completed',
  'expired',
] as const;

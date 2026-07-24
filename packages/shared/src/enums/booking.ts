export type BookingStatus =
  | 'requested'
  | 'pending_payment'
  | 'payment_processing'
  | 'payment_failed'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'expired';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'requested',
  'pending_payment',
  'payment_processing',
  'payment_failed',
  'accepted',
  'declined',
  'cancelled',
  'completed',
  'expired',
] as const;

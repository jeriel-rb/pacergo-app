import type { BookingStatus } from './stateMachine';

export type BookingBucket = 'upcoming' | 'requests' | 'past';

export function categorizeBooking(booking: { status: BookingStatus }): BookingBucket {
  switch (booking.status) {
    case 'requested':
    case 'pending_payment':
    case 'payment_processing':
    case 'payment_failed':
      return 'requests';
    case 'accepted':
      return 'upcoming';
    default:
      return 'past';
  }
}

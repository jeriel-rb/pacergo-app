import type { BookingStatus } from './stateMachine';

export type BookingBucket = 'upcoming' | 'requests' | 'past';

export function categorizeBooking(booking: { status: BookingStatus }): BookingBucket {
  switch (booking.status) {
    case 'requested':
      return 'requests';
    case 'accepted':
      return 'upcoming';
    default:
      return 'past';
  }
}

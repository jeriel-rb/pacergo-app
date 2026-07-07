import type { BookingStatus } from '../enums/booking';

export type BookingRole = 'seeker' | 'companion';
export type BookingAction = 'accept' | 'decline' | 'cancel' | 'complete';

/** Role + status aware booking actions, primary action first. Mirrors the
 *  accept/decline/cancel/complete RPC state machine enforced server-side. */
export function availableActions(status: BookingStatus, role: BookingRole): BookingAction[] {
  if (status === 'requested') {
    return role === 'companion' ? ['accept', 'decline'] : ['cancel'];
  }
  if (status === 'accepted') {
    return ['complete', 'cancel'];
  }
  return [];
}

const ACTION_STATUS: Record<BookingAction, BookingStatus> = {
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
  complete: 'completed',
};

export function actionToStatus(action: BookingAction): BookingStatus {
  return ACTION_STATUS[action];
}

/** Bookable time slots shown in booking forms: every 30 min, 06:00–22:00. */
export const BOOKING_TIME_SLOTS: readonly string[] = Array.from({ length: 33 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

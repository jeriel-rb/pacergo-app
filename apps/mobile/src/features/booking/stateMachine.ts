import type { BookingStatus } from '@pacergo/shared';

export type { BookingStatus };

export type BookingRole = 'seeker' | 'companion';
export type BookingAction = 'accept' | 'decline' | 'cancel' | 'complete';

export function availableActions(status: BookingStatus, role: BookingRole): BookingAction[] {
  if (status === 'requested') {
    return role === 'companion' ? ['accept', 'decline'] : ['cancel'];
  }
  if (status === 'accepted') {
    return ['cancel', 'complete'];
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

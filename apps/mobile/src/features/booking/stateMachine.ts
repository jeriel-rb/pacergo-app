// The booking FSM lives in @pacergo/shared (shared with web); re-exported so
// existing mobile imports keep working.
export {
  availableActions,
  actionToStatus,
  type BookingAction,
  type BookingRole,
  type BookingStatus,
} from '@pacergo/shared';

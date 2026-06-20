const KNOWN = new Set([
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_completed',
]);

export function notificationLabelKey(type: string): string {
  return KNOWN.has(type) ? `notif.${type}` : 'notif.generic';
}

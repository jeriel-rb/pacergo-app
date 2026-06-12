import { notificationLabelKey } from '../notificationLabel';

describe('notificationLabelKey', () => {
  it('maps a known type to its i18n key', () => {
    expect(notificationLabelKey('booking_requested')).toBe('notif.booking_requested');
  });

  it('falls back to a generic key for unknown types', () => {
    expect(notificationLabelKey('something_else')).toBe('notif.generic');
  });
});

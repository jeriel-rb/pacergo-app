import { categorizeBooking } from '../categorizeBooking';

const base = {
  status: 'requested' as const,
};

describe('categorizeBooking', () => {
  it('puts pending requests in the requests bucket', () => {
    expect(categorizeBooking({ ...base, status: 'requested' })).toBe('requests');
  });

  it('puts accepted bookings in upcoming', () => {
    expect(categorizeBooking({ ...base, status: 'accepted' })).toBe('upcoming');
  });

  it('puts finished/closed bookings in past', () => {
    expect(categorizeBooking({ ...base, status: 'completed' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'declined' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'cancelled' })).toBe('past');
    expect(categorizeBooking({ ...base, status: 'expired' })).toBe('past');
  });
});

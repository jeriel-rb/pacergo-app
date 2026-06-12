import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { from: jest.fn(() => ({ insert: mockInsert })) },
}));
jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'me' } }, loading: false }),
}));
jest.mock('@/features/profile/useProfile', () => ({
  __esModule: true,
  useProfile: () => ({ data: { display_name: 'Me', photo_url: null } }),
}));

import { useCreateBooking } from '../useCreateBooking';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  it('inserts a booking with seeker id + denormalized seeker name', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper });
    result.current.mutate({
      companion_id: 'c1',
      offering_id: 'o1',
      activity_slug: 'gym',
      tier: 'A',
      scheduled_start: '2026-07-01T10:00:00Z',
      duration_min: 60,
      location_name: 'Gym',
      agreed_price: 1200,
      is_free: false,
      seeker_note: null,
      companion_name: 'Coach',
      companion_photo: null,
    });
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    const arg = mockInsert.mock.calls[0][0];
    expect(arg.seeker_id).toBe('me');
    expect(arg.seeker_name).toBe('Me');
    expect(arg.status).toBe('requested');
  });
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = jest.fn().mockResolvedValue({ data: 'booking-1', error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { useCreateBooking } from '../useCreateBooking';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  it('creates the booking via the create_booking RPC', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper });
    result.current.mutate({
      companion_id: 'c1',
      offering_id: 'o1',
      scheduled_start: '2026-07-01T10:00:00Z',
      duration_min: 60,
      location_name: 'Gym',
      seeker_note: null,
    });
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    const [fn, params] = mockRpc.mock.calls[0];
    expect(fn).toBe('create_booking');
    expect(params).toEqual({
      p_companion_id: 'c1',
      p_offering_id: 'o1',
      p_scheduled_start: '2026-07-01T10:00:00Z',
      p_duration_min: 60,
      p_location_name: 'Gym',
      p_seeker_note: null,
    });
  });
});

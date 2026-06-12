import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    rpc: jest.fn().mockResolvedValue({
      data: [
        {
          companion_id: 'c1',
          display_name: 'Coach',
          tier: 'A',
          activity_slug: 'gym',
          price_ntd: 1200,
          is_free: false,
          distance_m: 800,
        },
      ],
      error: null,
    }),
  },
}));

import { useNearbyCompanions } from '../useNearbyCompanions';
import { supabase } from '@/lib/supabase/client';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNearbyCompanions', () => {
  it('calls the nearby_companions RPC and returns rows', async () => {
    const { result } = renderHook(
      () =>
        useNearbyCompanions(
          { lat: 25, lng: 121 },
          { activitySlug: null, tier: null, maxPrice: null, radiusM: 20000 }
        ),
      { wrapper }
    );
    await waitFor(() => expect(result.current.data?.[0].display_name).toBe('Coach'));
    expect(supabase.rpc).toHaveBeenCalledWith(
      'nearby_companions',
      expect.objectContaining({ center_lat: 25 })
    );
  });
});

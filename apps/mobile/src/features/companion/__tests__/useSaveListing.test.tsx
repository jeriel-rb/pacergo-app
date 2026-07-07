import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = jest.fn().mockResolvedValue({ data: 'l1', error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'me' } }, loading: false }),
}));

import { useSaveListing } from '../useSaveListing';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSaveListing', () => {
  it('saves the listing via the upsert_my_listing RPC', async () => {
    const { result } = renderHook(() => useSaveListing(), { wrapper });
    result.current.mutate({
      headline: 'Coach',
      bio_long: null,
      served_area: 'Da’an',
      status: 'active',
    });
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('upsert_my_listing', {
      p_headline: 'Coach',
      p_bio_long: null,
      p_served_area: 'Da’an',
      p_status: 'active',
    });
  });
});

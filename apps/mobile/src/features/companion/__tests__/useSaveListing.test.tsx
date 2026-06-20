import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockListingSingle = jest.fn().mockResolvedValue({ data: { id: 'l1' }, error: null });
const mockProfileEq = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'companion_listings') {
        return {
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({ single: mockListingSingle })),
          })),
        };
      }
      return { update: jest.fn(() => ({ eq: mockProfileEq })) };
    }),
  },
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
  it('upserts the listing and flags the profile as a companion', async () => {
    const { result } = renderHook(() => useSaveListing(), { wrapper });
    result.current.mutate({
      headline: 'Coach',
      bio_long: null,
      served_area: 'Da’an',
      status: 'active',
    });
    await waitFor(() => expect(mockProfileEq).toHaveBeenCalled());
  });
});

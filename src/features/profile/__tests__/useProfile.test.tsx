import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/supabase/client', () => {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: { id: 'u1', display_name: 'Lee', onboarding_completed: true },
    error: null,
  });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { __esModule: true, supabase: { from } };
});

jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'u1' } }, loading: false }),
}));

import { useProfile } from '../useProfile';
import { supabase } from '@/lib/supabase/client';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProfile', () => {
  it('loads the current user profile', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.data?.display_name).toBe('Lee'));
    expect(supabase.from as jest.Mock).toHaveBeenCalledWith('profiles');
  });
});

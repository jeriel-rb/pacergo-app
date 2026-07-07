import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = jest.fn().mockResolvedValue({
  data: { display_name: 'Lee', onboarding_completed: true, is_admin: false },
  error: null,
});
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'u1' } }, loading: false }),
}));

import { useProfile } from '../useProfile';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProfile', () => {
  it('loads the profile via get_my_profile, keyed to the session id', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.data?.display_name).toBe('Lee'));
    expect(result.current.data?.id).toBe('u1');
    expect(mockRpc).toHaveBeenCalledWith('get_my_profile');
  });
});

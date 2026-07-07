import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('@/features/auth/useSession', () => ({
  __esModule: true,
  useSession: () => ({ session: { user: { id: 'me' } }, loading: false }),
}));

import { useBlock } from '../useBlocks';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBlock', () => {
  it('blocks via the block_user RPC', async () => {
    const { result } = renderHook(() => useBlock(), { wrapper });
    result.current.mutate('other');
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('block_user', { p_user_id: 'other' });
  });
});

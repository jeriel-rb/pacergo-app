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

import { useBlock } from '../useBlocks';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBlock', () => {
  it('inserts a block row from the current user', async () => {
    const { result } = renderHook(() => useBlock(), { wrapper });
    result.current.mutate('other');
    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ blocker_id: 'me', blocked_id: 'other' });
  });
});

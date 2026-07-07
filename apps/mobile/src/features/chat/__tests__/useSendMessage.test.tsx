import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = jest.fn().mockResolvedValue({ data: 'm1', error: null });
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { useSendMessage } from '../useSendMessage';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSendMessage', () => {
  it('sends via the send_message RPC', async () => {
    const { result } = renderHook(() => useSendMessage('c1'), { wrapper });
    result.current.mutate('hello');
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('send_message', {
      p_conversation_id: 'c1',
      p_body: 'hello',
    });
  });
});

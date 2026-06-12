import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

import { SessionProvider } from '../SessionProvider';
import { useSession } from '../useSession';

function Probe() {
  const { loading } = useSession();
  return <Text>{loading ? 'loading' : 'ready'}</Text>;
}

describe('SessionProvider', () => {
  it('starts loading then resolves to ready', async () => {
    const { getByText } = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    expect(getByText('loading')).toBeTruthy();
    await waitFor(() => expect(getByText('ready')).toBeTruthy());
  });
});

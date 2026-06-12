jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  supabase: {
    auth: { signInWithIdToken: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

import { signInWithAppleIdentityToken } from '../oauth';
import { supabase } from '@/lib/supabase/client';

describe('signInWithAppleIdentityToken', () => {
  beforeEach(() => (supabase.auth.signInWithIdToken as jest.Mock).mockClear());

  it('passes the identity token to supabase with provider apple', async () => {
    await signInWithAppleIdentityToken('tok-123');
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'tok-123',
    });
  });

  it('throws when no token is provided', async () => {
    await expect(signInWithAppleIdentityToken(null)).rejects.toThrow();
  });
});

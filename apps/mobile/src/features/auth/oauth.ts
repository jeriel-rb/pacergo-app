import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase/client';

export async function signInWithAppleIdentityToken(identityToken: string | null) {
  if (!identityToken) throw new Error('Apple sign-in returned no identity token');
  return supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken });
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  return signInWithAppleIdentityToken(credential.identityToken);
}

export async function signInWithGoogleIdToken(idToken: string | null) {
  if (!idToken) throw new Error('Google sign-in returned no id token');
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
}

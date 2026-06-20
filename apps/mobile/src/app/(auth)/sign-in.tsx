import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  isGoogleConfigured,
  isAppleConfigured,
  googleWebClientId,
  googleIosClientId,
} from '@/features/auth/authConfig';
import { signInWithApple, signInWithGoogleIdToken } from '@/features/auth/oauth';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId,
    iosClientId: googleIosClientId,
  });

  async function onApple() {
    try {
      setBusy(true);
      await signInWithApple();
    } catch (e) {
      Alert.alert('Apple', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    try {
      setBusy(true);
      const result = await promptGoogle();
      if (result?.type === 'success') {
        await signInWithGoogleIdToken(result.params.id_token ?? null);
      }
    } catch (e) {
      Alert.alert('Google', String(e));
    } finally {
      setBusy(false);
    }
  }

  // Surface async google errors.
  if (googleResponse?.type === 'error') {
    Alert.alert('Google', googleResponse.error?.message ?? 'error');
  }

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center">
        <AppText variant="display">{t('auth.welcomeTitle')}</AppText>
        <AppText variant="body" className="mt-3 text-dark-text-secondary">
          {t('auth.welcomeSubtitle')}
        </AppText>
      </View>
      <View className="gap-3 pb-6">
        {isGoogleConfigured() ? (
          <Button label={t('auth.continueGoogle')} onPress={onGoogle} disabled={busy} />
        ) : null}
        {isAppleConfigured() ? (
          <Button
            label={t('auth.continueApple')}
            variant="secondary"
            onPress={onApple}
            disabled={busy}
          />
        ) : null}
        {!isGoogleConfigured() && !isAppleConfigured() ? (
          <AppText variant="caption" className="text-center">
            {t('auth.notConfigured')}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

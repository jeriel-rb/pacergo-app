import { View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useMyVerification, useSubmitVerification } from '@/features/companion/useVerification';

export default function VerificationScreen() {
  const { t } = useTranslation();
  const { data: verification } = useMyVerification();
  const submit = useSubmitVerification();

  async function pickAndUpload(docType: 'certification' | 'id') {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    try {
      await submit.mutateAsync({ docType, fileUri: result.assets[0].uri });
      Alert.alert('Pacergo', t('verification.submitted'));
    } catch {
      Alert.alert('Pacergo', t('verification.error'));
    }
  }

  const statusText =
    verification?.status === 'approved'
      ? t('verification.approved')
      : verification?.status === 'rejected'
        ? t('verification.rejected')
        : verification?.status === 'pending'
          ? t('verification.pending')
          : null;

  return (
    <ScreenContainer>
      <View className="gap-6 pt-6">
        <AppText variant="h1">{t('verification.title')}</AppText>
        <AppText variant="body" className="text-dark-text-secondary">
          {t('verification.intro')}
        </AppText>
        {statusText ? (
          <View className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{statusText}</AppText>
          </View>
        ) : null}
        <Button
          label={t('verification.pickCert')}
          onPress={() => pickAndUpload('certification')}
          disabled={submit.isPending}
        />
        <Button
          label={t('verification.pickId')}
          variant="secondary"
          onPress={() => pickAndUpload('id')}
          disabled={submit.isPending}
        />
      </View>
    </ScreenContainer>
  );
}

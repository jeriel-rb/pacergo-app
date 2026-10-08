import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { reportReasons, type ReportReason } from '@/features/safety/reportSchema';
import { useReport } from '@/features/safety/useReport';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');

  async function submit() {
    try {
      await report.mutateAsync({ reportedId: id, reason, details });
      Alert.alert('PacerGo', t('safety.reported'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('safety.error'));
    }
  }

  return (
    <ScreenContainer>
      <View className="gap-4 pt-6">
        <AppText variant="h1">{t('safety.reportTitle')}</AppText>
        {reportReasons.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            className={`rounded-lg p-4 ${reason === r ? 'bg-brand-deep' : 'bg-dark-surface'}`}
          >
            <AppText className={reason === r ? 'text-white' : 'text-dark-text'}>
              {t(`safety.reason_${r}`)}
            </AppText>
          </Pressable>
        ))}
        <TextInput
          placeholder={t('safety.details')}
          placeholderTextColor="#6B6B74"
          value={details}
          onChangeText={setDetails}
          multiline
          className="h-24 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <Button label={t('safety.submit')} onPress={submit} disabled={report.isPending} />
      </View>
    </ScreenContainer>
  );
}

import { useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useActivities } from '@/features/profile/useActivities';
import { useMyListing } from '@/features/companion/useMyListing';
import { useSubmitVerification } from '@/features/companion/useVerification';

type DocType = 'certification' | 'competition';

/**
 * Per-activity verification (same model as web): a certification unlocks
 * Tier B/A for ONE activity; Tier A additionally needs approved competition
 * experience for that activity. Deep-linkable with ?docType=&activity=.
 */
export default function VerificationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ docType?: string; activity?: string }>();
  const activities = useActivities();
  const { data: bundle } = useMyListing();
  const submit = useSubmitVerification();

  const [docType, setDocType] = useState<DocType>(
    params.docType === 'competition' ? 'competition' : 'certification',
  );
  const [activitySlug, setActivitySlug] = useState<string | null>(params.activity ?? null);

  const slug = activitySlug ?? activities.data?.[0]?.slug ?? null;
  const statusMap = docType === 'competition' ? bundle?.competitions : bundle?.verifications;
  const current = slug ? statusMap?.[slug] : undefined;

  async function pickAndUpload() {
    if (!slug) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    try {
      await submit.mutateAsync({
        docType,
        activitySlug: slug,
        fileUri: result.assets[0].uri,
      });
      Alert.alert('Pacergo', t('verification.submitted'));
    } catch {
      Alert.alert('Pacergo', t('verification.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('verification.title')}</AppText>
        <AppText variant="body" className="text-dark-text-secondary">
          {t('verification.intro')}
        </AppText>

        <AppText variant="h3">{t('verification.docType')}</AppText>
        <View className="flex-row gap-2">
          {(['certification', 'competition'] as DocType[]).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDocType(d)}
              className={`rounded-md px-3 py-2 ${docType === d ? 'bg-brand-deep' : 'bg-dark-surface'}`}
            >
              <AppText className={docType === d ? 'text-white' : 'text-dark-text'}>
                {t(`verification.${d}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="h3">{t('verification.activity')}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {(activities.data ?? []).map((a) => {
            const active = slug === a.slug;
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivitySlug(a.slug)}
                className={`rounded-md px-3 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`}
              >
                <AppText className={active ? 'text-white' : 'text-dark-text'}>{a.name_en}</AppText>
              </Pressable>
            );
          })}
        </View>

        {current ? (
          <View className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{t(`verification.${current.status}`)}</AppText>
          </View>
        ) : null}

        <Button
          label={t('verification.pickDoc')}
          onPress={pickAndUpload}
          disabled={submit.isPending || !slug || current?.status === 'approved'}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

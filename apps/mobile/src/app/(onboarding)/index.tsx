import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useActivities } from '@/features/profile/useActivities';
import { useCompleteOnboarding } from '@/features/profile/useProfile';
import { useOnboardingStore } from '@/features/profile/onboardingStore';
import { onboardingSchema, experienceLevels } from '@/features/profile/profileSchema';

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const store = useOnboardingStore();
  const activities = useActivities();
  const complete = useCompleteOnboarding();

  async function finish() {
    const parsed = onboardingSchema.safeParse({
      displayName: store.displayName,
      birthdate: store.birthdate,
      experienceLevel: store.experienceLevel,
      activityIds: store.activityIds,
    });
    if (!parsed.success) {
      Alert.alert('Pacergo', t('onboarding.ageError'));
      return;
    }
    try {
      await complete.mutateAsync({
        displayName: parsed.data.displayName,
        experienceLevel: parsed.data.experienceLevel,
        homeArea: store.homeArea || null,
        activityIds: parsed.data.activityIds,
      });
      store.reset();
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Pacergo', t('onboarding.saveError'));
    }
  }

  const expOptions = experienceLevels.map((value) => ({ value, label: t(`onboarding.${value}`) }));

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-6">
        {step === 0 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.nameLabel')}</AppText>
            <TextInput
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor="#6B6B74"
              value={store.displayName}
              onChangeText={(v) => store.setField('displayName', v)}
              className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B6B74"
              value={store.birthdate}
              onChangeText={(v) => store.setField('birthdate', v)}
              className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
            <AppText variant="caption">{t('onboarding.birthdateLabel')}</AppText>
          </View>
        )}

        {step === 1 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.experienceLabel')}</AppText>
            <SegmentedControl
              value={store.experienceLevel}
              onChange={(v) => store.setField('experienceLevel', v)}
              options={expOptions}
            />
            <TextInput
              placeholder={t('onboarding.areaLabel')}
              placeholderTextColor="#6B6B74"
              value={store.homeArea}
              onChangeText={(v) => store.setField('homeArea', v)}
              className="mt-2 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
            />
          </View>
        )}

        {step === 2 && (
          <View className="gap-3">
            <AppText variant="h1">{t('onboarding.activitiesLabel')}</AppText>
            <View className="flex-row flex-wrap gap-2">
              {(activities.data ?? []).map((a) => {
                const selected = store.activityIds.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => store.toggleActivity(a.id)}
                    className={`rounded-md px-4 py-2 ${selected ? 'bg-brand-deep' : 'bg-dark-surface'}`}
                  >
                    <AppText className={selected ? 'text-white' : 'text-dark-text'}>
                      {i18n.language.startsWith('zh') ? a.name_zh : a.name_en}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View className="flex-row gap-3 pb-6">
        {step > 0 && (
          <View className="flex-1">
            <Button label={t('onboarding.back')} variant="secondary" onPress={() => setStep(step - 1)} />
          </View>
        )}
        <View className="flex-1">
          {step < 2 ? (
            <Button label={t('onboarding.next')} onPress={() => setStep(step + 1)} />
          ) : (
            <Button label={t('onboarding.finish')} onPress={finish} disabled={complete.isPending} />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

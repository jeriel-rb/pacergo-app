import { useState } from 'react';
import { View, TextInput, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { useActivities } from '@/features/profile/useActivities';
import { useSaveListing } from '@/features/companion/useSaveListing';
import { useSaveOfferings } from '@/features/companion/useSaveOfferings';
import { useCompanionStore } from '@/features/companion/companionStore';
import { validateOffering } from '@/features/companion/validateOffering';
import type { Tier } from '@/features/discovery/types';

const TIERS: Tier[] = ['A', 'B', 'C'];

export default function CompanionSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const activities = useActivities();
  const store = useCompanionStore();
  const saveListing = useSaveListing();
  const saveOfferings = useSaveOfferings();

  const [activityId, setActivityId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('B');
  const [minutes, setMinutes] = useState('60');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);

  function addOffering() {
    const aId = activityId ?? activities.data?.[0]?.id;
    if (!aId) return;
    const draft = {
      activity_id: aId,
      tier,
      price_ntd: isFree ? 0 : Number(price) || 0,
      is_free: isFree,
      session_minutes: Number(minutes) || 60,
    };
    const v = validateOffering({ tier: draft.tier, priceNtd: draft.price_ntd, isFree: draft.is_free });
    if (!v.ok) {
      Alert.alert('Pacergo', t('companionSetup.invalidOffering'));
      return;
    }
    store.addOffering(draft);
    setPrice('');
  }

  async function finish() {
    if (store.offerings.length === 0) {
      Alert.alert('Pacergo', t('companionSetup.needOffering'));
      return;
    }
    try {
      const listingId = await saveListing.mutateAsync({
        headline: store.headline || null,
        bio_long: null,
        served_area: store.servedArea || null,
        status: 'active',
      });
      await saveOfferings.mutateAsync({ listingId, offerings: store.offerings });
      store.reset();
      Alert.alert('Pacergo', t('companionSetup.saved'));
      router.replace('/companion-dashboard');
    } catch {
      Alert.alert('Pacergo', t('companionSetup.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('companionSetup.title')}</AppText>

        <TextInput
          placeholder={t('companionSetup.headline')}
          placeholderTextColor="#6B6B74"
          value={store.headline}
          onChangeText={(v) => store.setField('headline', v)}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('companionSetup.area')}
          placeholderTextColor="#6B6B74"
          value={store.servedArea}
          onChangeText={(v) => store.setField('servedArea', v)}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <AppText variant="h3">{t('companionSetup.addOffering')}</AppText>
        <View className="flex-row flex-wrap gap-2">
          {(activities.data ?? []).map((a) => {
            const active = (activityId ?? activities.data?.[0]?.id) === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivityId(a.id)}
                className={`rounded-md px-3 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`}
              >
                <AppText className={active ? 'text-white' : 'text-dark-text'}>{a.name_en}</AppText>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row gap-2">
          {TIERS.map((tt) => (
            <Pressable
              key={tt}
              onPress={() => setTier(tt)}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                tier === tt ? 'bg-brand-deep' : 'bg-dark-surface'
              }`}
            >
              <AppText className={tier === tt ? 'text-white' : 'text-dark-text'}>{tt}</AppText>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center justify-between rounded-md bg-dark-surface px-4 py-3">
          <AppText variant="body">{t('companionSetup.free')}</AppText>
          <Switch value={isFree} onValueChange={setIsFree} />
        </View>
        <TextInput
          placeholder={t('companionSetup.minutes')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={minutes}
          onChangeText={setMinutes}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        {!isFree ? (
          <TextInput
            placeholder={t('companionSetup.price')}
            placeholderTextColor="#6B6B74"
            keyboardType="number-pad"
            value={price}
            onChangeText={setPrice}
            className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
          />
        ) : null}
        <Button label={t('companionSetup.add')} variant="secondary" onPress={addOffering} />

        {store.offerings.map((o, i) => (
          <Pressable
            key={i}
            onPress={() => store.removeOffering(i)}
            className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4"
          >
            <View className="flex-row items-center gap-2">
              <TierBadge tier={o.tier} />
              <AppText variant="body">
                {o.session_minutes} min · {o.is_free ? t('companionSetup.free') : `NT$${o.price_ntd}`}
              </AppText>
            </View>
            <AppText variant="caption">✕</AppText>
          </Pressable>
        ))}

        <Button label={t('companionSetup.finish')} onPress={finish} disabled={saveListing.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}

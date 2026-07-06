import { useState } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TIER_PRICE_FLOORS, TIER_REQUIRES_CERT, type Tier } from '@pacergo/shared';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { useActivities } from '@/features/profile/useActivities';
import { useSaveListing } from '@/features/companion/useSaveListing';
import { useSaveOfferings } from '@/features/companion/useSaveOfferings';
import { useCompanionStore } from '@/features/companion/companionStore';
import { validateOffering } from '@/features/companion/validateOffering';

const TIERS: Tier[] = ['A', 'B', 'C'];

export default function CompanionSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const activities = useActivities();
  const store = useCompanionStore();
  const saveListing = useSaveListing();
  const saveOfferings = useSaveOfferings();

  const [activityId, setActivityId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>('C');
  const [minutes, setMinutes] = useState('60');
  const [price, setPrice] = useState(String(TIER_PRICE_FLOORS.C));

  function selectTier(next: Tier) {
    setTier(next);
    // Reset to the tier's floor so the draft starts valid.
    setPrice(String(TIER_PRICE_FLOORS[next]));
  }

  function addOffering() {
    const activity = (activities.data ?? []).find(
      (a) => a.id === (activityId ?? activities.data?.[0]?.id),
    );
    if (!activity) return;
    const draft = {
      activity_id: activity.id,
      activity_slug: activity.slug,
      tier,
      price_ntd: Number(price) || 0,
      session_minutes: Number(minutes) || 60,
    };
    const v = validateOffering({ tier: draft.tier, priceNtd: draft.price_ntd, isFree: false });
    if (!v.ok) {
      Alert.alert(
        'Pacergo',
        t('companionSetup.belowFloor', { min: TIER_PRICE_FLOORS[tier], tier }),
      );
      return;
    }
    store.addOffering(draft);
    setPrice(String(TIER_PRICE_FLOORS[tier]));
  }

  async function finish() {
    if (store.offerings.length === 0) {
      Alert.alert('Pacergo', t('companionSetup.needOffering'));
      return;
    }
    try {
      await saveListing.mutateAsync({
        headline: store.headline || null,
        bio_long: null,
        served_area: store.servedArea || null,
        status: 'active',
      });
      await saveOfferings.mutateAsync({ offerings: store.offerings });
      store.reset();
      Alert.alert('Pacergo', t('companionSetup.saved'));
      router.replace('/companion-dashboard');
    } catch (e) {
      // Surface the server rule that failed (price floor / cert / competition
      // gate from the add_offering RPC) instead of a generic error.
      const detail = e instanceof Error && e.message ? `\n${e.message}` : '';
      Alert.alert('Pacergo', `${t('companionSetup.error')}${detail}`);
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
              onPress={() => selectTier(tt)}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                tier === tt ? 'bg-brand-deep' : 'bg-dark-surface'
              }`}
            >
              <AppText className={tier === tt ? 'text-white' : 'text-dark-text'}>{tt}</AppText>
            </Pressable>
          ))}
        </View>
        {TIER_REQUIRES_CERT[tier] ? (
          <AppText variant="caption">{t('companionSetup.certHint')}</AppText>
        ) : null}
        <TextInput
          placeholder={t('companionSetup.minutes')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={minutes}
          onChangeText={setMinutes}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('companionSetup.price')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={price}
          onChangeText={setPrice}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <AppText variant="caption">
          {t('companionSetup.floorHint', { tier, min: TIER_PRICE_FLOORS[tier] })}
        </AppText>
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
                {o.session_minutes} min · NT${o.price_ntd}
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

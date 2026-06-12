import { useState } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { useCompanion } from '@/features/discovery/useCompanion';
import { useCreateBooking } from '@/features/booking/useCreateBooking';

export default function RequestScreen() {
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useCompanion(companionId);
  const create = useCreateBooking();

  const offerings = data?.offerings ?? [];
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');

  const offering = offerings.find((o) => o.id === offeringId) ?? offerings[0] ?? null;

  async function send() {
    if (!offering) return;
    try {
      await create.mutateAsync({
        companion_id: companionId,
        offering_id: offering.id,
        activity_slug: null,
        tier: offering.tier,
        scheduled_start: when ? new Date(when.replace(' ', 'T')).toISOString() : null,
        duration_min: offering.session_minutes,
        location_name: where || null,
        agreed_price: offering.is_free ? 0 : offering.price_ntd,
        is_free: offering.is_free,
        seeker_note: note || null,
        companion_name: data?.detail?.display_name ?? null,
        companion_photo: data?.detail?.photo_url ?? null,
      });
      Alert.alert('Pacergo', t('request.sent'));
      router.replace('/(tabs)/bookings');
    } catch {
      Alert.alert('Pacergo', t('request.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('request.title')}</AppText>

        <AppText variant="h3">{t('request.pickOffering')}</AppText>
        {offerings.map((o) => {
          const active = (offering?.id ?? null) === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => setOfferingId(o.id)}
              className={`flex-row items-center justify-between rounded-lg p-4 ${
                active ? 'bg-brand-deep' : 'bg-dark-surface'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <TierBadge tier={o.tier} />
                <AppText variant="body" className={active ? 'text-white' : 'text-dark-text'}>
                  {o.session_minutes} min
                </AppText>
              </View>
              <PriceTag amount={o.is_free ? 0 : o.price_ntd} />
            </Pressable>
          );
        })}

        <TextInput
          placeholder={t('request.when')}
          placeholderTextColor="#6B6B74"
          value={when}
          onChangeText={setWhen}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('request.where')}
          placeholderTextColor="#6B6B74"
          value={where}
          onChangeText={setWhere}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('request.note')}
          placeholderTextColor="#6B6B74"
          value={note}
          onChangeText={setNote}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <Button label={t('request.send')} onPress={send} disabled={!offering || create.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}

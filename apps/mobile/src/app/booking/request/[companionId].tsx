import { useMemo, useState } from 'react';
import { View, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { BOOKING_TIME_SLOTS, wallTimeToUtcIso } from '@pacergo/shared';
import { useCompanion } from '@/features/discovery/useCompanion';
import { useCreateBooking } from '@/features/booking/useCreateBooking';

function toKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function RequestScreen() {
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data } = useCompanion(companionId);
  const create = useCreateBooking();

  const offerings = data?.offerings ?? [];
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');

  const offering = offerings.find((o) => o.id === offeringId) ?? offerings[0] ?? null;

  // The next 14 days, labelled in the UI locale (e.g. 6/23 週一).
  const days = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'zh-TW', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { key: toKey(d), label: fmt.format(d) };
    });
  }, [i18n.language]);

  async function send() {
    if (!offering) return;
    try {
      await create.mutateAsync({
        companion_id: companionId,
        offering_id: offering.id,
        scheduled_start: day && slot ? wallTimeToUtcIso(day, slot) : null,
        duration_min: offering.session_minutes,
        location_name: where || null,
        seeker_note: note || null,
      });
      Alert.alert('PacerGo', t('request.sent'));
      router.replace('/(tabs)/bookings');
    } catch {
      Alert.alert('PacerGo', t('request.error'));
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

        <View className="gap-2">
          <AppText variant="h3">{t('request.when')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  setDay(null);
                  setSlot(null);
                }}
                className={`rounded-md px-3 py-2 ${day === null ? 'bg-brand-deep' : 'bg-dark-surface'}`}
              >
                <AppText className={day === null ? 'text-white' : 'text-dark-text'}>
                  {t('request.flexible')}
                </AppText>
              </Pressable>
              {days.map((d) => (
                <Pressable
                  key={d.key}
                  onPress={() => setDay(d.key)}
                  className={`rounded-md px-3 py-2 ${day === d.key ? 'bg-brand-deep' : 'bg-dark-surface'}`}
                >
                  <AppText className={day === d.key ? 'text-white' : 'text-dark-text'}>
                    {d.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {day ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {BOOKING_TIME_SLOTS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSlot(s)}
                    className={`rounded-md px-3 py-2 ${slot === s ? 'bg-brand-deep' : 'bg-dark-surface'}`}
                  >
                    <AppText className={slot === s ? 'text-white' : 'text-dark-text'}>{s}</AppText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
          <AppText variant="caption">{t('request.whenHint')}</AppText>
        </View>

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

        <Button
          label={t('request.send')}
          onPress={send}
          disabled={!offering || (day !== null && slot === null) || create.isPending}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

import { useEffect, useState } from 'react';
import { TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAvailability, useSaveAvailability } from '@/features/companion/useAvailability';

type Slot = { weekday: number; start_minute: number; end_minute: number };

export default function AvailabilityEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useAvailability();
  const save = useSaveAvailability();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState('1');
  const [startH, setStartH] = useState('18');
  const [endH, setEndH] = useState('20');

  useEffect(() => {
    if (data) {
      setSlots(
        data.map((s) => ({
          weekday: s.weekday,
          start_minute: s.start_minute,
          end_minute: s.end_minute,
        }))
      );
    }
  }, [data]);

  function add() {
    const wd = Math.max(0, Math.min(6, Number(day) || 0));
    const sm = Math.max(0, Math.min(23, Number(startH) || 0)) * 60;
    const em = Math.max(1, Math.min(24, Number(endH) || 1)) * 60;
    if (em <= sm) return;
    setSlots((prev) => [...prev, { weekday: wd, start_minute: sm, end_minute: em }]);
  }

  async function onSave() {
    try {
      await save.mutateAsync(slots);
      Alert.alert('Pacergo', t('editor.saved'));
      router.back();
    } catch {
      Alert.alert('Pacergo', t('editor.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 12 }}>
        <AppText variant="h1">{t('editor.availabilityTitle')}</AppText>
        <TextInput
          placeholder={t('editor.day')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={day}
          onChangeText={setDay}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.startHour')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={startH}
          onChangeText={setStartH}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.endHour')}
          placeholderTextColor="#6B6B74"
          keyboardType="number-pad"
          value={endH}
          onChangeText={setEndH}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <Button label={t('editor.addSlot')} variant="secondary" onPress={add} />

        {slots.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
            className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4"
          >
            <AppText variant="body">
              {s.weekday} · {Math.floor(s.start_minute / 60)}:00–{Math.floor(s.end_minute / 60)}:00
            </AppText>
            <AppText variant="caption">✕</AppText>
          </Pressable>
        ))}

        <Button label={t('editor.save')} onPress={onSave} disabled={save.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}

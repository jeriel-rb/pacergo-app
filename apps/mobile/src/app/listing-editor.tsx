import { useEffect, useState } from 'react';
import { TextInput, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useMyListing } from '@/features/companion/useMyListing';
import { useSaveListing } from '@/features/companion/useSaveListing';

export default function ListingEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useMyListing();
  const save = useSaveListing();

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  useEffect(() => {
    if (data?.listing) {
      setHeadline(data.listing.headline ?? '');
      setBio(data.listing.bio_long ?? '');
      setArea(data.listing.served_area ?? '');
      setStatus(data.listing.status === 'paused' ? 'paused' : 'active');
    }
  }, [data?.listing]);

  async function onSave() {
    try {
      await save.mutateAsync({
        headline: headline || null,
        bio_long: bio || null,
        served_area: area || null,
        status,
      });
      Alert.alert('PacerGo', t('editor.saved'));
      router.back();
    } catch {
      Alert.alert('PacerGo', t('editor.error'));
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('editor.listingTitle')}</AppText>
        <TextInput
          placeholder={t('editor.headline')}
          placeholderTextColor="#6B6B74"
          value={headline}
          onChangeText={setHeadline}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.bio')}
          placeholderTextColor="#6B6B74"
          value={bio}
          onChangeText={setBio}
          multiline
          className="h-28 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <TextInput
          placeholder={t('editor.area')}
          placeholderTextColor="#6B6B74"
          value={area}
          onChangeText={setArea}
          className="rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />
        <AppText variant="caption">{t('editor.status')}</AppText>
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: t('editor.active') },
            { value: 'paused', label: t('editor.paused') },
          ]}
        />
        <Button label={t('editor.save')} onPress={onSave} disabled={save.isPending} />
      </ScrollView>
    </ScreenContainer>
  );
}

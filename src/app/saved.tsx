import { FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { useSavedIds } from '@/features/discovery/useSaved';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const saved = useSavedIds();
  const ids = saved.data ?? [];

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('discover.saved')}
      </AppText>
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        renderItem={({ item }) => (
          <AppText
            variant="body"
            className="mb-2 rounded-lg bg-dark-surface p-4"
            onPress={() => router.push(`/companion/${item}`)}
          >
            {item}
          </AppText>
        )}
        ListEmptyComponent={<AppText variant="caption">{t('discover.empty')}</AppText>}
      />
    </ScreenContainer>
  );
}

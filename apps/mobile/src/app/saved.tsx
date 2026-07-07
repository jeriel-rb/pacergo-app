import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { useSavedFeed } from '@/features/discovery/useSaved';

export default function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const feed = useSavedFeed();

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('discover.saved')}
      </AppText>
      <FlatList
        data={feed.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/companion/${item.id}`)}
            className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
          >
            <Avatar name={item.display_name ?? ''} photoUrl={item.photo_url} size={48} />
            <View className="flex-1 gap-0.5">
              <AppText variant="h3">{item.display_name ?? ''}</AppText>
              {item.home_area ? <AppText variant="caption">{item.home_area}</AppText> : null}
            </View>
            {item.tier ? <TierBadge tier={item.tier} /> : null}
            <PriceTag amount={item.is_free ? 0 : item.price_ntd} />
          </Pressable>
        )}
        ListEmptyComponent={<AppText variant="caption">{t('discover.empty')}</AppText>}
      />
    </ScreenContainer>
  );
}

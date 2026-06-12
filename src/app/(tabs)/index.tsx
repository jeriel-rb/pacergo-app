import { View, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CompanionCard } from '@/components/discovery/CompanionCard';
import { ActivityChips } from '@/components/discovery/ActivityChips';
import { FilterChips } from '@/components/discovery/FilterChips';
import { CompanionMap } from '@/components/discovery/CompanionMap';
import { useFilterStore } from '@/features/discovery/filterStore';
import { useLocationCenter } from '@/features/discovery/useLocationCenter';
import { useNearbyCompanions } from '@/features/discovery/useNearbyCompanions';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const center = useLocationCenter();
  const f = useFilterStore();
  const nearby = useNearbyCompanions(center, {
    activitySlug: f.activitySlug,
    tier: f.tier,
    maxPrice: f.maxPrice,
    radiusM: f.radiusM,
  });
  const companions = nearby.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <AppText variant="h1">{t('discover.title')}</AppText>
          <View className="w-40">
            <SegmentedControl
              value={f.view}
              onChange={f.setView}
              options={[
                { value: 'feed', label: t('discover.feed') },
                { value: 'map', label: t('discover.map') },
              ]}
            />
          </View>
        </View>
        <ActivityChips selected={f.activitySlug} onSelect={f.setActivity} />
        <FilterChips tier={f.tier} onTier={f.setTier} />
      </View>

      {f.view === 'feed' ? (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
          data={companions}
          keyExtractor={(c) => `${c.companion_id}-${c.activity_slug}`}
          renderItem={({ item }) => (
            <CompanionCard
              companion={item}
              onPress={() => router.push(`/companion/${item.companion_id}`)}
            />
          )}
          ListEmptyComponent={
            <AppText variant="caption" className="mt-10 text-center">
              {t('discover.empty')}
            </AppText>
          }
        />
      ) : (
        <View className="mt-3 flex-1">
          <CompanionMap
            center={center}
            companions={companions}
            onSelect={(id) => router.push(`/companion/${id}`)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

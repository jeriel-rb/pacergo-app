import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { formatDistanceMeters } from '@/lib/format';
import type { NearbyCompanion } from '@/features/discovery/types';

export function CompanionCard({
  companion,
  onPress,
}: {
  companion: NearbyCompanion;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
    >
      <Avatar name={companion.display_name ?? ''} photoUrl={companion.photo_url} size={56} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <TierBadge tier={companion.tier} />
          <AppText variant="h3">{companion.display_name ?? ''}</AppText>
        </View>
        <AppText variant="caption">
          {companion.activity_slug} · {formatDistanceMeters(companion.distance_m)}
          {companion.home_area ? ` · ${companion.home_area}` : ''}
        </AppText>
      </View>
      <PriceTag amount={companion.is_free ? 0 : companion.price_ntd} />
    </Pressable>
  );
}

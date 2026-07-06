import { View, Text } from 'react-native';
import type { Tier } from '@pacergo/shared';
import { palette } from '@/lib/theme/tokens';

export type { Tier };

export function TierBadge({ tier }: { tier: Tier }) {
  const color = palette.tier[tier].to;
  return (
    <View
      accessibilityLabel={`Tier ${tier}`}
      style={{ backgroundColor: color }}
      className="h-6 w-6 items-center justify-center rounded-full"
    >
      <Text className="font-sans-semibold text-[13px] text-white">{tier}</Text>
    </View>
  );
}

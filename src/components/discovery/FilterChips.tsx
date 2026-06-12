import { View, Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { Tier } from '@/features/discovery/types';

const TIERS: Tier[] = ['A', 'B', 'C'];

export function FilterChips({
  tier,
  onTier,
}: {
  tier: Tier | null;
  onTier: (t: Tier | null) => void;
}) {
  return (
    <View className="mt-2 flex-row">
      {TIERS.map((tt) => {
        const active = tier === tt;
        return (
          <Pressable
            key={tt}
            onPress={() => onTier(active ? null : tt)}
            className={`mr-2 h-9 w-9 items-center justify-center rounded-full ${
              active ? 'bg-brand-deep' : 'bg-dark-surface'
            }`}
          >
            <AppText className={active ? 'text-white' : 'text-dark-text'}>{tt}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

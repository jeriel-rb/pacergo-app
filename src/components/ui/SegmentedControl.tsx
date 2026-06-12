import { View, Text, Pressable } from 'react-native';

export type SegmentOption<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
}) {
  return (
    <View className="flex-row rounded-md bg-dark-surface p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-sm py-2 ${active ? 'bg-brand-deep' : ''}`}
          >
            <Text className={active ? 'text-white' : 'text-dark-text-secondary'}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

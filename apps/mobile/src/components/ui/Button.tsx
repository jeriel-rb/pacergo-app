import { Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const containerClass: Record<Variant, string> = {
  primary: 'bg-brand-deep',
  secondary: 'bg-dark-surface border border-white/10',
  ghost: 'bg-transparent',
  destructive: 'bg-danger',
};

const labelClass: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-dark-text',
  ghost: 'text-brand',
  destructive: 'text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`h-12 items-center justify-center rounded-md px-5 ${containerClass[variant]} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Text className={`font-sans-semibold text-[16px] ${labelClass[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}

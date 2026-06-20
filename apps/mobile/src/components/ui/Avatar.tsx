import { View, Text, Image } from 'react-native';

export function Avatar({
  name,
  photoUrl,
  size = 64,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  if (photoUrl) {
    return (
      <Image
        accessibilityLabel="avatar"
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-brand-deep"
    >
      <Text className="font-display text-[24px] text-white">{initial}</Text>
    </View>
  );
}

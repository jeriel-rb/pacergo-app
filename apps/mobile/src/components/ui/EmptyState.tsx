import { View } from 'react-native';
import { AppText } from './AppText';

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <AppText variant="caption" className="text-center">
        {message}
      </AppText>
    </View>
  );
}

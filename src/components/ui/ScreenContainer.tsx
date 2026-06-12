import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ScreenContainer({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 px-6">{children}</View>
    </SafeAreaView>
  );
}

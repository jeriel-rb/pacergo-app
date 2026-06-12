import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';

export default function ChatScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="h1">{t('chatScreen.title')}</AppText>
      </View>
    </SafeAreaView>
  );
}

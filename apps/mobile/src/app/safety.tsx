import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';

export default function SafetyCenter() {
  const { t } = useTranslation();
  const tips = [t('safety.tip1'), t('safety.tip2'), t('safety.tip3')];
  return (
    <ScreenContainer>
      <View className="gap-4 pt-6">
        <AppText variant="h1">{t('safety.centerTitle')}</AppText>
        <AppText variant="h3">{t('safety.tipsTitle')}</AppText>
        {tips.map((tip, i) => (
          <View key={i} className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{tip}</AppText>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

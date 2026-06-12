import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { supabase } from '@/lib/supabase/client';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <AppText variant="h1">{t('settings.title')}</AppText>

        <View className="gap-2">
          <AppText variant="caption">{t('settings.language')}</AppText>
          <SegmentedControl
            value={i18n.language.startsWith('zh') ? 'zh-Hant' : 'en'}
            onChange={(v) => i18n.changeLanguage(v)}
            options={[
              { value: 'en', label: t('settings.english') },
              { value: 'zh-Hant', label: t('settings.chinese') },
            ]}
          />
        </View>

        <View className="gap-2">
          <AppText variant="caption">{t('settings.theme')}</AppText>
          <SegmentedControl
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </View>

        <View className="mt-auto pb-6">
          <Button
            label={t('settings.signOut')}
            variant="destructive"
            onPress={() => supabase.auth.signOut()}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

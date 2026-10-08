import { View, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { supabase } from '@/lib/supabase/client';
import { useDeleteAccount } from '@/features/account/useDeleteAccount';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const del = useDeleteAccount();

  function confirmDelete() {
    Alert.alert('PacerGo', t('settings.deleteConfirm'), [
      { text: t('bookingDetail.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync();
          } catch {
            Alert.alert('PacerGo', t('settings.deleteError'));
          }
        },
      },
    ]);
  }

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

        <Pressable
          onPress={() => router.push('/notifications')}
          className="rounded-lg bg-dark-surface p-4"
        >
          <AppText variant="body">{t('settings.notifications')}</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/safety')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('settings.safety')}</AppText>
        </Pressable>
        <Pressable onPress={confirmDelete} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body" className="text-danger">
            {t('settings.deleteAccount')}
          </AppText>
        </Pressable>

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

import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useProfile } from '@/features/profile/useProfile';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <View className="items-center gap-3">
          <Avatar name={profile?.display_name ?? ''} photoUrl={profile?.photo_url} />
          <AppText variant="h2">{profile?.display_name ?? t('profile.noName')}</AppText>
        </View>

        <Pressable
          onPress={() =>
            router.push(profile?.is_companion ? '/companion-dashboard' : '/companion-setup')
          }
          className="rounded-lg bg-dark-surface p-4"
        >
          <AppText variant="body">
            {profile?.is_companion ? t('dashboard.title') : t('profile.becomeCompanion')}
          </AppText>
        </Pressable>

        <Pressable onPress={() => router.push('/ai-plan')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.aiPlan')}</AppText>
        </Pressable>

        <Pressable onPress={() => router.push('/settings')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.settings')}</AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

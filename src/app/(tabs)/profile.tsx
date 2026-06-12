import { View, Switch, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useProfile, useUpdateProfile } from '@/features/profile/useProfile';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <View className="items-center gap-3">
          <Avatar name={profile?.display_name ?? ''} photoUrl={profile?.photo_url} />
          <AppText variant="h2">{profile?.display_name ?? t('profile.noName')}</AppText>
        </View>

        <View className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.availableAsCompanion')}</AppText>
          <Switch
            value={profile?.is_companion ?? false}
            onValueChange={(v) => update.mutate({ is_companion: v })}
          />
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          className="rounded-lg bg-dark-surface p-4"
        >
          <AppText variant="body">{t('profile.settings')}</AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

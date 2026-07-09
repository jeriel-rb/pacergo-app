import { View, Pressable, Image, Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supportMailto } from '@pacergo/shared';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useProfile } from '@/features/profile/useProfile';
import { useSetAvatar, useSetBanner } from '@/features/profile/useProfileMedia';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const setAvatar = useSetAvatar();
  const setBanner = useSetBanner();

  async function pick(kind: 'avatar' | 'banner') {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    try {
      const uri = result.assets[0].uri;
      await (kind === 'avatar' ? setAvatar : setBanner).mutateAsync(uri);
    } catch {
      Alert.alert('Pacergo', t('profile.uploadError'));
    }
  }

  async function contactSupport() {
    try {
      await Linking.openURL(supportMailto(t('profile.supportSubject')));
    } catch {
      Alert.alert('Pacergo', t('profile.supportError'));
    }
  }

  return (
    <ScreenContainer>
      <View className="flex-1 gap-6 pt-6">
        <View className="items-center gap-3">
          <Pressable onPress={() => pick('banner')} className="w-full">
            {profile?.banner_url ? (
              <Image
                source={{ uri: profile.banner_url }}
                className="h-28 w-full rounded-lg"
                resizeMode="cover"
              />
            ) : (
              <View className="h-28 w-full items-center justify-center rounded-lg bg-dark-surface">
                <AppText variant="caption">{t('profile.addBanner')}</AppText>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => pick('avatar')} className="-mt-12">
            <Avatar name={profile?.display_name ?? ''} photoUrl={profile?.photo_url} />
          </Pressable>
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

        <Pressable onPress={contactSupport} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.support')}</AppText>
        </Pressable>

        {profile?.is_admin ? (
          <Pressable onPress={() => router.push('/admin')} className="rounded-lg bg-dark-surface p-4">
            <AppText variant="body">{t('profile.admin')}</AppText>
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.push('/settings')} className="rounded-lg bg-dark-surface p-4">
          <AppText variant="body">{t('profile.settings')}</AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

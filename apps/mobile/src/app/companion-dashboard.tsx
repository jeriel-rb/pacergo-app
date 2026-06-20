import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBookings } from '@/features/booking/useBookings';
import { useSession } from '@/features/auth/useSession';

export default function CompanionDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data } = useBookings();

  const asCompanion = (data ?? []).filter((b) => b.companion_id === uid);
  const requests = asCompanion.filter((b) => b.status === 'requested');
  const upcoming = asCompanion.filter((b) => b.status === 'accepted');

  const row = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} className="rounded-lg bg-dark-surface p-4">
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <AppText variant="h1">{t('dashboard.title')}</AppText>

        <AppText variant="h3">{t('dashboard.requests')}</AppText>
        {requests.length === 0 ? (
          <AppText variant="caption">{t('dashboard.none')}</AppText>
        ) : (
          requests.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}`)}
              className="flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={b.seeker_name ?? ''} photoUrl={b.seeker_photo} size={44} />
              <View className="flex-1">
                <AppText variant="body">{b.seeker_name ?? ''}</AppText>
              </View>
              <StatusPill status={b.status} />
            </Pressable>
          ))
        )}

        <AppText variant="h3">{t('dashboard.upcoming')}</AppText>
        {upcoming.length === 0 ? (
          <AppText variant="caption">{t('dashboard.none')}</AppText>
        ) : (
          upcoming.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/booking/${b.id}`)}
              className="flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={b.seeker_name ?? ''} photoUrl={b.seeker_photo} size={44} />
              <AppText variant="body" className="flex-1">
                {b.seeker_name ?? ''}
              </AppText>
              <StatusPill status={b.status} />
            </Pressable>
          ))
        )}

        <View className="rounded-lg bg-dark-surface p-4">
          <AppText variant="caption">{t('dashboard.earnings')}</AppText>
          <AppText variant="body">{t('dashboard.earningsPlaceholder')}</AppText>
        </View>

        {row(t('dashboard.editListing'), () => router.push('/listing-editor'))}
        {row(t('dashboard.editAvailability'), () => router.push('/availability-editor'))}
        {row(t('dashboard.verify'), () => router.push('/verification'))}
      </ScrollView>
    </ScreenContainer>
  );
}

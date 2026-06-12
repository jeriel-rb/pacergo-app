import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/ui/PriceTag';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBooking } from '@/features/booking/useBooking';
import { useTransitionBooking } from '@/features/booking/useTransitionBooking';
import { availableActions, type BookingAction } from '@/features/booking/stateMachine';
import { useSession } from '@/features/auth/useSession';
import { useEnsureConversation } from '@/features/chat/useEnsureConversation';

const ACTION_VARIANT: Record<BookingAction, 'primary' | 'secondary' | 'destructive'> = {
  accept: 'primary',
  complete: 'primary',
  decline: 'destructive',
  cancel: 'destructive',
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { data: booking } = useBooking(id);
  const transition = useTransitionBooking(id);
  const ensure = useEnsureConversation();

  if (!booking) {
    return (
      <ScreenContainer>
        <AppText variant="body" className="pt-10">
          {t('common.loading')}
        </AppText>
      </ScreenContainer>
    );
  }

  const amSeeker = booking.seeker_id === session?.user.id;
  const role = amSeeker ? 'seeker' : 'companion';
  const name = amSeeker ? booking.companion_name : booking.seeker_name;
  const photo = amSeeker ? booking.companion_photo : booking.seeker_photo;
  const actions = availableActions(booking.status, role);

  async function openChat() {
    if (!booking) return;
    const otherId = amSeeker ? booking.companion_id : booking.seeker_id;
    const otherName = amSeeker ? booking.companion_name : booking.seeker_name;
    const otherPhoto = amSeeker ? booking.companion_photo : booking.seeker_photo;
    const convoId = await ensure.mutateAsync({
      otherId,
      otherName,
      otherPhoto,
      bookingId: booking.id,
    });
    router.push(`/chat/${convoId}`);
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        <View className="items-center gap-2">
          <Avatar name={name ?? ''} photoUrl={photo} size={80} />
          <AppText variant="h2">{name ?? ''}</AppText>
          <StatusPill status={booking.status} />
        </View>

        <View className="gap-2 rounded-lg bg-dark-surface p-4">
          <AppText variant="caption">{t('bookingDetail.when')}</AppText>
          <AppText variant="body">{booking.scheduled_start ?? '—'}</AppText>
          <AppText variant="caption" className="mt-2">
            {t('bookingDetail.where')}
          </AppText>
          <AppText variant="body">{booking.location_name ?? '—'}</AppText>
          <AppText variant="caption" className="mt-2">
            {t('bookingDetail.price')}
          </AppText>
          <PriceTag amount={booking.is_free ? 0 : booking.agreed_price} />
        </View>

        <View className="gap-3">
          {actions.map((a) => (
            <Button
              key={a}
              label={t(`bookingDetail.${a}`)}
              variant={ACTION_VARIANT[a]}
              onPress={() => transition.mutate(a)}
              disabled={transition.isPending}
            />
          ))}
          <Button label={t('bookingDetail.message')} variant="secondary" onPress={openChat} />
          {booking.status === 'completed' ? (
            <Button
              label={t('bookingDetail.review')}
              variant="secondary"
              onPress={() => router.push(`/booking/review/${id}`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

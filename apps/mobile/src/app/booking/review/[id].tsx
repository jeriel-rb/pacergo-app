import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useBooking } from '@/features/booking/useBooking';
import { useSubmitReview } from '@/features/booking/useSubmitReview';
import { useSession } from '@/features/auth/useSession';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { data: booking } = useBooking(id);
  const submit = useSubmitReview(id);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  async function send() {
    if (!booking) return;
    const amSeeker = booking.seeker_id === session?.user.id;
    const revieweeId = amSeeker ? booking.companion_id : booking.seeker_id;
    try {
      await submit.mutateAsync({ revieweeId, rating, comment });
      Alert.alert('Pacergo', t('review.thanks'));
      router.back();
    } catch {
      Alert.alert('Pacergo', t('review.error'));
    }
  }

  return (
    <ScreenContainer>
      <View className="gap-6 pt-6">
        <AppText variant="h1">{t('review.title')}</AppText>

        <View className="gap-2">
          <AppText variant="caption">{t('review.rating')}</AppText>
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  n <= rating ? 'bg-brand-deep' : 'bg-dark-surface'
                }`}
              >
                <AppText className={n <= rating ? 'text-white' : 'text-dark-text'}>{n}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <TextInput
          placeholder={t('review.comment')}
          placeholderTextColor="#6B6B74"
          value={comment}
          onChangeText={setComment}
          multiline
          className="h-28 rounded-md bg-dark-surface px-4 py-3 text-dark-text"
        />

        <Button label={t('review.submit')} onPress={send} disabled={submit.isPending} />
      </View>
    </ScreenContainer>
  );
}

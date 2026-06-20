import { useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/booking/StatusPill';
import { useBookings } from '@/features/booking/useBookings';
import { useSession } from '@/features/auth/useSession';
import { categorizeBooking, type BookingBucket } from '@/features/booking/categorizeBooking';

const TABS: BookingBucket[] = ['upcoming', 'requests', 'past'];

export default function BookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data } = useBookings();
  const [tab, setTab] = useState<BookingBucket>('upcoming');

  const items = (data ?? []).filter((b) => categorizeBooking(b) === tab);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <AppText variant="h1" className="mb-3">
          {t('bookings.title')}
        </AppText>
        <View className="flex-row rounded-md bg-dark-surface p-1">
          {TABS.map((b) => (
            <Pressable
              key={b}
              onPress={() => setTab(b)}
              className={`flex-1 items-center rounded-sm py-2 ${tab === b ? 'bg-brand-deep' : ''}`}
            >
              <AppText className={tab === b ? 'text-white' : 'text-dark-text-secondary'}>
                {t(`bookings.${b}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
        data={items}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => {
          const amSeeker = item.seeker_id === uid;
          const name = amSeeker ? item.companion_name : item.seeker_name;
          const photo = amSeeker ? item.companion_photo : item.seeker_photo;
          return (
            <Pressable
              onPress={() => router.push(`/booking/${item.id}`)}
              className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={name ?? ''} photoUrl={photo} size={48} />
              <View className="flex-1 gap-1">
                <AppText variant="h3">{name ?? ''}</AppText>
                <StatusPill status={item.status} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {t('bookings.empty')}
          </AppText>
        }
      />
    </SafeAreaView>
  );
}

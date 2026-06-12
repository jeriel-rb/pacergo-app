import { useEffect } from 'react';
import { FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useNotifications,
  useMarkNotificationsRead,
} from '@/features/notifications/useNotifications';
import { notificationLabelKey } from '@/features/notifications/notificationLabel';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if ((data ?? []).some((n) => !n.read_at)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('notif.title')}
      </AppText>
      <FlatList
        data={data ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              item.payload.booking_id && router.push(`/booking/${item.payload.booking_id}`)
            }
            className={`mb-2 rounded-lg p-4 ${item.read_at ? 'bg-dark-surface' : 'bg-dark-elevated'}`}
          >
            <AppText variant="body">{t(notificationLabelKey(item.type))}</AppText>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState message={t('notif.empty')} />}
      />
    </ScreenContainer>
  );
}

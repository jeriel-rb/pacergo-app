import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '@/features/booking/stateMachine';

const color: Record<BookingStatus, string> = {
  requested: '#FFB020',
  accepted: '#3DDC97',
  declined: '#FF5C5C',
  cancelled: '#6B6B74',
  completed: '#7C5CFF',
  expired: '#6B6B74',
};

export function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: color[status] }} className="self-start rounded-full px-3 py-1">
      <Text className="font-sans-semibold text-[12px] text-white">
        {t(`bookingStatus.${status}`)}
      </Text>
    </View>
  );
}

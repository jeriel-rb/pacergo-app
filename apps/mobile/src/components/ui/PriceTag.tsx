import { Text } from 'react-native';
import { formatNTD, type Locale } from '@/lib/format';

export function PriceTag({
  amount,
  locale = 'en',
}: {
  amount: number;
  locale?: Locale;
}) {
  return (
    <Text className="font-sans-semibold text-[16px] text-dark-text">
      {formatNTD(amount, locale)}
    </Text>
  );
}

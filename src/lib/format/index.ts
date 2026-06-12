export type Locale = 'en' | 'zh-Hant';

const FREE_LABEL: Record<Locale, string> = {
  en: 'Free',
  'zh-Hant': '免費',
};

export function formatNTD(amount: number, locale: Locale = 'en'): string {
  if (amount <= 0) return FREE_LABEL[locale];
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

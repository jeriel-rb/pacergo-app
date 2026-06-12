import { ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { useActivities } from '@/features/profile/useActivities';

export function ActivityChips({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const { data } = useActivities();
  const { t, i18n } = useTranslation();
  const zh = i18n.language.startsWith('zh');
  const chip = (active: boolean) =>
    `mr-2 rounded-md px-4 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
      <Pressable className={chip(selected === null)} onPress={() => onSelect(null)}>
        <AppText className={selected === null ? 'text-white' : 'text-dark-text'}>
          {t('discover.all')}
        </AppText>
      </Pressable>
      {(data ?? []).map((a) => (
        <Pressable key={a.id} className={chip(selected === a.slug)} onPress={() => onSelect(a.slug)}>
          <AppText className={selected === a.slug ? 'text-white' : 'text-dark-text'}>
            {zh ? a.name_zh : a.name_en}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

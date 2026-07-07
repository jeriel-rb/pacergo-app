import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Sparkles, CalendarCheck, Heart, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { useProfile } from '@/features/profile/useProfile';
import { useWeeklyProgress, useSetWeeklyTarget } from '@/features/home/useWeeklyProgress';

function QuickAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-lg bg-dark-surface p-4"
    >
      <Icon color="#7C8CF8" size={22} />
      <AppText variant="caption" className="text-center">
        {label}
      </AppText>
    </Pressable>
  );
}

/** Dashboard home — greeting, hero, quick actions, weekly progress (web parity). */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: progress } = useWeeklyProgress();
  const setTarget = useSetWeeklyTarget();

  const name = profile?.display_name?.split(' ')[0] || t('home.guest');
  const today = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  const target = progress?.target ?? 5;
  const done = progress?.done ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <View>
          <AppText variant="caption">{today}</AppText>
          <AppText variant="h1">{t('home.greeting', { name })}</AppText>
          <AppText variant="caption">{t('home.prompt')}</AppText>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)')}
          className="gap-1 rounded-2xl bg-brand-deep p-5"
        >
          <AppText variant="caption" className="uppercase tracking-widest text-white/70">
            {t('home.heroKicker')}
          </AppText>
          <AppText variant="h2" className="text-white">
            {t('home.heroTitle')}
          </AppText>
          <AppText variant="caption" className="text-white/80">
            {t('home.heroCta')} →
          </AppText>
        </Pressable>

        <View className="flex-row gap-3">
          <QuickAction icon={Users} label={t('home.find')} onPress={() => router.push('/(tabs)')} />
          <QuickAction
            icon={Sparkles}
            label={t('home.aiPlan')}
            onPress={() => router.push('/ai-plan')}
          />
          <QuickAction
            icon={CalendarCheck}
            label={t('home.sessions')}
            onPress={() => router.push('/(tabs)/bookings')}
          />
          <QuickAction icon={Heart} label={t('home.savedList')} onPress={() => router.push('/saved')} />
        </View>

        <View className="gap-3 rounded-lg bg-dark-surface p-4">
          <View className="flex-row items-center justify-between">
            <AppText variant="h3">{t('home.weekly')}</AppText>
            <AppText variant="caption">
              {done}/{target} · {pct}%
            </AppText>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-white/10">
            <View className="h-2 rounded-full bg-brand-deep" style={{ width: `${pct}%` }} />
          </View>
          <View className="flex-row gap-2">
            {[3, 5, 7].map((n) => (
              <Pressable
                key={n}
                onPress={() => setTarget.mutate(n)}
                className={`rounded-md px-3 py-1.5 ${
                  target === n ? 'bg-brand-deep' : 'bg-white/5'
                }`}
              >
                <AppText variant="caption" className={target === n ? 'text-white' : undefined}>
                  {t('home.perWeek', { count: n })}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

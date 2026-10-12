import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  TRAINING_GOALS,
  ONBOARDING_EXPERIENCES,
  PLAN_GENDERS,
  TRAINING_FREQUENCIES,
  TRAINING_LOCATIONS,
  generateTrainingPlan,
  generatorInputFromMobileSelection,
  type TrainingGoal,
  type OnboardingExperience,
  type PlanGender,
  type TrainingFrequency,
  type TrainingLocation,
  type ExerciseRecord,
  type GeneratedPlan,
} from '@pacergo/shared';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

type Locale = 'zh' | 'en';

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View className="gap-2">
      <AppText variant="h3">{label}</AppText>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`rounded-md px-3 py-2 ${active ? 'bg-brand-deep' : 'bg-dark-surface'}`}
            >
              <AppText className={active ? 'text-white' : 'text-dark-text'}>{opt.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

async function fetchExercises(): Promise<ExerciseRecord[]> {
  const { data, error } = await supabase.from('exercises').select('*');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const instructionsEn = Array.isArray(row.instructions_en) ? row.instructions_en : [];
    const instructionsZh = Array.isArray(row.instructions_zh) ? row.instructions_zh : [];
    const en = instructionsEn.slice(0, 2).join(' ');
    const zh = instructionsZh.slice(0, 2).join('');
    return {
      slug: String(row.slug),
      nameEn: String(row.name_en ?? ''),
      nameZh: String(row.name_zh ?? ''),
      muscleGroups: Array.isArray(row.muscle_groups) ? (row.muscle_groups as string[]) : [],
      equipmentSettings: Array.isArray(row.equipment_settings) ? (row.equipment_settings as string[]) : [],
      equipment: Array.isArray(row.equipment) ? (row.equipment as string[]) : undefined,
      hasInstructions: instructionsEn.length > 0,
      shortCue: en ? { en, zh: zh || en } : undefined,
    };
  });
}

export default function AiPlanScreen() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'zh';

  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [level, setLevel] = useState<OnboardingExperience | null>(null);
  const [gender, setGender] = useState<PlanGender>('male');
  const [frequency, setFrequency] = useState<TrainingFrequency>('3x');
  const [location, setLocation] = useState<TrainingLocation>('gym');
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const ready = goal !== null && level !== null && !busy;

  async function generate() {
    if (!goal || !level) return;
    setBusy(true);
    setError(false);
    try {
      const exercises = await fetchExercises();
      setPlan(
        generateTrainingPlan({
          ...generatorInputFromMobileSelection({
            goal,
            gender,
            level,
            frequency,
            location,
            locale,
          }),
          exercises,
        }),
      );
    } catch {
      setPlan(null);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const pick = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPlan(null);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 16 }}>
        <AppText variant="h1">{t('aiPlan.title')}</AppText>
        <AppText variant="caption">{t('aiPlan.subtitle')}</AppText>

        <ChipGroup
          label={t('aiPlan.goalLabel')}
          options={TRAINING_GOALS.map((g) => ({ value: g, label: t(`aiPlan.goal.${g}`) }))}
          value={goal}
          onChange={pick(setGoal)}
        />
        <ChipGroup
          label={t('aiPlan.levelLabel')}
          options={ONBOARDING_EXPERIENCES.map((l) => ({ value: l, label: t(`aiPlan.level.${l}`) }))}
          value={level}
          onChange={pick(setLevel)}
        />
        <ChipGroup
          label={t('aiPlan.genderLabel')}
          options={PLAN_GENDERS.map((g) => ({ value: g, label: t(`aiPlan.gender.${g}`) }))}
          value={gender}
          onChange={pick(setGender)}
        />
        <ChipGroup
          label={t('aiPlan.freqLabel')}
          options={TRAINING_FREQUENCIES.map((f) => ({ value: f, label: t(`aiPlan.freq.${f}`) }))}
          value={frequency}
          onChange={pick(setFrequency)}
        />
        <ChipGroup
          label={t('aiPlan.locationLabel')}
          options={TRAINING_LOCATIONS.map((l) => ({ value: l, label: t(`aiPlan.location.${l}`) }))}
          value={location}
          onChange={pick(setLocation)}
        />

        <Button label={busy ? t('aiPlan.generating') : t('aiPlan.generate')} onPress={generate} disabled={!ready} />

        {error ? (
          <AppText variant="caption" className="text-center">
            {t('aiPlan.error')}
          </AppText>
        ) : null}

        {plan ? (
          <View className="gap-4 rounded-lg bg-dark-surface p-4">
            {plan.weeks.map((week) => (
              <View key={week.weekIndex} className="gap-2">
                <AppText variant="h3">{t('aiPlan.week', { number: week.weekIndex })}</AppText>
                {week.days
                  .filter((day) => !day.isRestDay && day.session)
                  .map((day) => (
                    <View key={day.dayIndex} className="gap-1">
                      <AppText variant="body" className="font-sans-semibold">
                        {day.dayLabel[locale]}
                      </AppText>
                      {day.session!.main.map((exercise) => (
                        <AppText key={exercise.slug} variant="caption">
                          {exercise.name[locale]} · {exercise.sets}×{exercise.reps}
                        </AppText>
                      ))}
                    </View>
                  ))}
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="caption" className="text-center">
            {t('aiPlan.empty')}
          </AppText>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  TRAINING_GOALS,
  AGE_BANDS,
  EXPERIENCE_LEVELS,
  PLAN_GENDERS,
  WEIGHT_CLASSES,
  TRAINING_FREQUENCIES,
  TRAINING_LOCATIONS,
  DIET_MODES,
  composePlan,
  type TrainingGoal,
  type AgeBand,
  type ExperienceLevel,
  type PlanGender,
  type WeightClass,
  type TrainingFrequency,
  type TrainingLocation,
  type DietMode,
} from '@pacergo/shared';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PlanMarkdown } from '@/components/plan/PlanMarkdown';
import { useProfile } from '@/features/profile/useProfile';

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

export default function AiPlanScreen() {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();

  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [gender, setGender] = useState<PlanGender>(
    profile?.gender === 'female' ? 'female' : 'male',
  );
  const [weightClass, setWeightClass] = useState<WeightClass>('medium');
  const [frequency, setFrequency] = useState<TrainingFrequency>('mid');
  const [location, setLocation] = useState<TrainingLocation>('full_gym');
  const [dietMode, setDietMode] = useState<DietMode>('none');
  const [plan, setPlan] = useState<string | null>(null);

  const ready = goal !== null && ageBand !== null && level !== null;

  function generate() {
    if (!goal || !ageBand || !level) return;
    setPlan(
      composePlan({
        goal,
        gender,
        level,
        ageBand,
        weightClass,
        frequency,
        location,
        nutrition: true,
        dietMode,
        locale: i18n.language === 'en' ? 'en' : 'zh',
      }),
    );
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
          label={t('aiPlan.ageLabel')}
          options={AGE_BANDS.map((a) => ({ value: a, label: t(`aiPlan.age.${a}`) }))}
          value={ageBand}
          onChange={pick(setAgeBand)}
        />
        <ChipGroup
          label={t('aiPlan.levelLabel')}
          options={EXPERIENCE_LEVELS.map((l) => ({ value: l, label: t(`aiPlan.level.${l}`) }))}
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
          label={t('aiPlan.weightLabel')}
          options={WEIGHT_CLASSES.map((w) => ({ value: w, label: t(`aiPlan.weight.${w}`) }))}
          value={weightClass}
          onChange={pick(setWeightClass)}
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
        <ChipGroup
          label={t('aiPlan.dietLabel')}
          options={DIET_MODES.map((d) => ({ value: d, label: t(`aiPlan.diet.${d}`) }))}
          value={dietMode}
          onChange={pick(setDietMode)}
        />

        <Button label={t('aiPlan.generate')} onPress={generate} disabled={!ready} />

        {plan ? (
          <View className="rounded-lg bg-dark-surface p-4">
            <PlanMarkdown markdown={plan} />
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

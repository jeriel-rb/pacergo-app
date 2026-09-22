"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_WORKOUT_SPLITS } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function WorkoutSplitView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setWorkoutSplit } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.workoutSplit.title")}
      subtitle={t("trainingPreferences.workoutSplit.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!trainingPreferences.workoutSplit}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_WORKOUT_SPLITS.map((s) => (
        <OptionCard
          key={s}
          badge={t(`trainingPreferences.workoutSplit.options.${s}.badge`)}
          title={t(`trainingPreferences.workoutSplit.options.${s}.title`)}
          description={t(`trainingPreferences.workoutSplit.options.${s}.description`)}
          selected={trainingPreferences.workoutSplit === s}
          onSelect={() => setWorkoutSplit(s)}
        />
      ))}
    </StepScreen>
  );
}

"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_EXCLUDED_MUSCLES_MAX } from "@pacergo/shared";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";
import { MuscleGrid } from "./muscle-grid";

export function ExcludeMusclesSelectView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, toggleExcludedMuscle } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.excludeMusclesSelect.title")}
      subtitle={t("trainingPreferences.excludeMusclesSelect.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={goNext}
      onBack={goBack}
    >
      <MuscleGrid
        selected={trainingPreferences.excludedMuscles}
        onToggle={toggleExcludedMuscle}
        max={ONBOARDING_EXCLUDED_MUSCLES_MAX}
        blocked={trainingPreferences.prioritizeMuscles === true ? trainingPreferences.prioritizedMuscles : []}
        blockedBy="prioritized"
      />
    </StepScreen>
  );
}

"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_PRIORITIZED_MUSCLES_MAX } from "@pacergo/shared";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";
import { MuscleGrid } from "./muscle-grid";

export function PrioritizeMusclesSelectView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, togglePrioritizedMuscle } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.prioritizeMusclesSelect.title")}
      subtitle={t("trainingPreferences.prioritizeMusclesSelect.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={goNext}
      onBack={goBack}
    >
      <MuscleGrid
        selected={trainingPreferences.prioritizedMuscles}
        onToggle={togglePrioritizedMuscle}
        max={ONBOARDING_PRIORITIZED_MUSCLES_MAX}
        blocked={trainingPreferences.excludeMuscles === true ? trainingPreferences.excludedMuscles : []}
        blockedBy="excluded"
      />
    </StepScreen>
  );
}

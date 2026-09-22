"use client";

import { useTranslation } from "react-i18next";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function PrioritizeMusclesView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setPrioritizeMuscles } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.prioritizeMuscles.title")}
      subtitle={t("trainingPreferences.prioritizeMuscles.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={trainingPreferences.prioritizeMuscles === null}
      onContinue={goNext}
      onBack={goBack}
    >
      <OptionCard
        multi
        title={t("trainingPreferences.prioritizeMuscles.no.title")}
        description={t("trainingPreferences.prioritizeMuscles.no.description")}
        selected={trainingPreferences.prioritizeMuscles === false}
        onSelect={() => setPrioritizeMuscles(false)}
      />
      <OptionCard
        multi
        title={t("trainingPreferences.prioritizeMuscles.yes.title")}
        description={t("trainingPreferences.prioritizeMuscles.yes.description")}
        selected={trainingPreferences.prioritizeMuscles === true}
        onSelect={() => setPrioritizeMuscles(true)}
      />
    </StepScreen>
  );
}

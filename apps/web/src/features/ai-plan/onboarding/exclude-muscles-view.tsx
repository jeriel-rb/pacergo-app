"use client";

import { useTranslation } from "react-i18next";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function ExcludeMusclesView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setExcludeMuscles } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.excludeMuscles.title")}
      subtitle={t("trainingPreferences.excludeMuscles.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={trainingPreferences.excludeMuscles === null}
      onContinue={goNext}
      onBack={goBack}
    >
      <OptionCard
        multi
        title={t("trainingPreferences.excludeMuscles.no.title")}
        description={t("trainingPreferences.excludeMuscles.no.description")}
        selected={trainingPreferences.excludeMuscles === false}
        onSelect={() => setExcludeMuscles(false)}
      />
      <OptionCard
        multi
        title={t("trainingPreferences.excludeMuscles.yes.title")}
        description={t("trainingPreferences.excludeMuscles.yes.description")}
        selected={trainingPreferences.excludeMuscles === true}
        onSelect={() => setExcludeMuscles(true)}
      />
    </StepScreen>
  );
}

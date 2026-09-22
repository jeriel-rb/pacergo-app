"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_VARIETIES } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function VarietyView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setVariety } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.variety.title")}
      subtitle={t("trainingPreferences.variety.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!trainingPreferences.variety}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_VARIETIES.map((v) => (
        <OptionCard
          key={v}
          title={t(`trainingPreferences.variety.options.${v}.title`)}
          description={t(`trainingPreferences.variety.options.${v}.description`)}
          selected={trainingPreferences.variety === v}
          onSelect={() => setVariety(v)}
        />
      ))}
    </StepScreen>
  );
}

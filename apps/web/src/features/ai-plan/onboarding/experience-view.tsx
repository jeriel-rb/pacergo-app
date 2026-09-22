"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_EXPERIENCES } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function ExperienceView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setExperience } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.experience.title")}
      subtitle={t("trainingPreferences.experience.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!trainingPreferences.experience}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_EXPERIENCES.map((e) => (
        <OptionCard
          key={e}
          title={t(`trainingPreferences.experience.options.${e}.title`)}
          description={t(`trainingPreferences.experience.options.${e}.description`)}
          selected={trainingPreferences.experience === e}
          onSelect={() => setExperience(e)}
        />
      ))}
    </StepScreen>
  );
}

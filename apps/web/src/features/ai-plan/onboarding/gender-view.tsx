"use client";

import { useTranslation } from "react-i18next";
import { GENDERS } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

export function GenderView() {
  const { t } = useTranslation("onboarding");
  const { answers, setGender } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("gender.title")}
      continueLabel={t("continue")}
      continueDisabled={!answers.gender}
      onContinue={goNext}
      onBack={goBack}
    >
      {GENDERS.map((g) => (
        <OptionCard
          key={g}
          title={t(`gender.options.${g}`)}
          selected={answers.gender === g}
          onSelect={() => setGender(g)}
        />
      ))}
    </StepScreen>
  );
}

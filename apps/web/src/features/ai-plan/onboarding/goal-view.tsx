"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_GOALS } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

export function GoalView() {
  const { t } = useTranslation("onboarding");
  const { answers, setGoal } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("goal.title")}
      subtitle={t("goal.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!answers.goal}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_GOALS.map((g) => (
        <OptionCard
          key={g}
          title={t(`goal.options.${g}.title`)}
          description={t(`goal.options.${g}.description`)}
          selected={answers.goal === g}
          onSelect={() => setGoal(g)}
        />
      ))}
    </StepScreen>
  );
}

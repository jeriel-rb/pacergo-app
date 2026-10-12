"use client";

import { useTranslation } from "react-i18next";
import { PLAN_GENDERS, isPlanGender } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

/** Required male/female question. Saved to the Shared Fitness Profile and
 *  mirrored to `users.gender`. Nutrition uses it for BMR; the training plan
 *  does not. Prefill so it is never asked twice. */
export function GenderView() {
  const { t } = useTranslation("onboarding");
  const { answers, setGender } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("gender.title")}
      subtitle={t("gender.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!isPlanGender(answers.gender)}
      onContinue={goNext}
      onBack={goBack}
    >
      {PLAN_GENDERS.map((g) => (
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

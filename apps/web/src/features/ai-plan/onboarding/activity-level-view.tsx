"use client";

import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { ActivityLevelOptions } from "./activity-level-options";
import { StepScreen } from "./step-screen";

export function ActivityLevelView() {
  const { t } = useTranslation("onboarding");
  const { answers, setActivityLevel, markStepComplete } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("activityLevel.title")}
      continueLabel={t("continue")}
      continueDisabled={!answers.activityLevel}
      onContinue={() => {
        markStepComplete("aboutYou");
        goNext();
      }}
      onBack={goBack}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-muted p-4">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("activityLevel.hint")}</p>
      </div>
      <ActivityLevelOptions value={answers.activityLevel} onSelect={setActivityLevel} />
    </StepScreen>
  );
}

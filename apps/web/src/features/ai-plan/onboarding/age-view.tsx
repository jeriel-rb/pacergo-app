"use client";

import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { WheelPicker } from "@/shared/components/atoms/wheel-picker";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const MIN_AGE = 13;
const MAX_AGE = 90;
const DEFAULT_AGE = 30;
const AGE_VALUES = Array.from(
  { length: MAX_AGE - MIN_AGE + 1 },
  (_, i) => MIN_AGE + i,
);

export function AgeView() {
  const { t } = useTranslation("onboarding");
  const { answers, setAge } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  const age = answers.age ?? DEFAULT_AGE;

  return (
    <StepScreen
      title={t("age.title")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={() => {
        if (answers.age === null) setAge(DEFAULT_AGE);
        goNext();
      }}
      onBack={goBack}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-muted p-4">
        <Zap size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("age.hint")}</p>
      </div>

      <div className="flex items-center justify-center gap-3 py-4">
        <WheelPicker
          values={AGE_VALUES}
          value={age}
          onChange={setAge}
          ariaLabel={t("age.title")}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">{t("age.suffix")}</span>
      </div>
    </StepScreen>
  );
}

"use client";

import { useTranslation } from "react-i18next";
import {
  ONBOARDING_DURATION_DEFAULT,
  ONBOARDING_DURATION_MAX,
  ONBOARDING_DURATION_MIN,
  ONBOARDING_DURATION_STEP,
} from "@pacergo/shared";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";

export function DurationView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setDurationMin, markStepComplete } = useOnboarding();
  const { goNext, goBack } = useTrainingPreferencesNav();

  const minutes = trainingPreferences.durationMin ?? ONBOARDING_DURATION_DEFAULT;

  return (
    <StepScreen
      title={t("trainingPreferences.duration.title")}
      subtitle={t("trainingPreferences.duration.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={() => {
        if (trainingPreferences.durationMin === null) {
          setDurationMin(ONBOARDING_DURATION_DEFAULT);
        }
        markStepComplete("trainingPreferences");
        goNext();
      }}
      onBack={goBack}
    >
      <div className="rounded-2xl bg-muted p-4">
        <p className="text-sm font-semibold">
          {t("trainingPreferences.duration.recommendedTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("trainingPreferences.duration.recommendedBody")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 py-6">
        <p className="text-4xl font-extrabold tabular-nums">
          {minutes} {t("trainingPreferences.duration.unit")}
        </p>
        <input
          type="range"
          min={ONBOARDING_DURATION_MIN}
          max={ONBOARDING_DURATION_MAX}
          step={ONBOARDING_DURATION_STEP}
          value={minutes}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label={t("trainingPreferences.duration.title")}
        />
        <div className="flex w-full justify-between text-sm text-muted-foreground">
          <span>{t("trainingPreferences.duration.less")}</span>
          <span>{t("trainingPreferences.duration.more")}</span>
        </div>
      </div>
    </StepScreen>
  );
}

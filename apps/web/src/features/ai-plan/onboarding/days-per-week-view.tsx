"use client";

import { useTranslation } from "react-i18next";
import {
  ONBOARDING_DAYS_PER_WEEK,
  ONBOARDING_DAYS_RECOMMENDED,
  trainingDaysComplete,
} from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useTrainingPreferencesNav } from "./training-preferences-steps";
import { StepScreen } from "./step-screen";
import { TrainingDaysPicker } from "./training-days-picker";

export function DaysPerWeekView() {
  const { t } = useTranslation("onboarding");
  const { trainingPreferences, setDaysPerWeek, setTrainingDays } = useOnboarding();
  const { daysPerWeek, trainingDays } = trainingPreferences;
  const { goNext, goBack } = useTrainingPreferencesNav();

  return (
    <StepScreen
      title={t("trainingPreferences.daysPerWeek.title")}
      subtitle={t("trainingPreferences.daysPerWeek.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={!trainingDaysComplete(daysPerWeek, trainingDays)}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_DAYS_PER_WEEK.map((d) => (
        <OptionCard
          key={d}
          badge={
            ONBOARDING_DAYS_RECOMMENDED.includes(d)
              ? t("trainingPreferences.daysPerWeek.recommendedBadge")
              : undefined
          }
          title={t(`trainingPreferences.daysPerWeek.options.${d}`)}
          selected={trainingPreferences.daysPerWeek === d}
          onSelect={() => setDaysPerWeek(d)}
        />
      ))}
      {daysPerWeek && (
        <TrainingDaysPicker daysPerWeek={daysPerWeek} value={trainingDays} onChange={setTrainingDays} />
      )}
    </StepScreen>
  );
}

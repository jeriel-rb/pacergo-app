"use client";

import { useTranslation } from "react-i18next";
import {
  FileText,
  SlidersHorizontal,
  BarChart3,
  CalendarDays,
  PlayCircle,
  BatteryMedium,
  type LucideIcon,
} from "lucide-react";
import {
  ONBOARDING_USE_CASES,
  ONBOARDING_USE_CASE_MAX,
  type OnboardingUseCase,
} from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const USE_CASE_ICONS: Record<OnboardingUseCase, LucideIcon> = {
  log_weights_reps: FileText,
  personalized_plan: SlidersHorizontal,
  progressive_overload: BarChart3,
  manage_plan_workouts: CalendarDays,
  exercise_demos: PlayCircle,
  muscle_recovery: BatteryMedium,
};

export function UseCaseView() {
  const { t } = useTranslation("onboarding");
  const { answers, toggleUseCase } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("useCase.title")}
      subtitle={t("useCase.subtitle", { max: ONBOARDING_USE_CASE_MAX })}
      continueLabel={t("continue")}
      continueDisabled={answers.useCases.length === 0}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_USE_CASES.map((u) => {
        const selected = answers.useCases.includes(u);
        const atMax = !selected && answers.useCases.length >= ONBOARDING_USE_CASE_MAX;
        return (
          <OptionCard
            key={u}
            icon={USE_CASE_ICONS[u]}
            title={t(`useCase.options.${u}`)}
            selected={selected}
            multi
            onSelect={() => {
              if (atMax) return;
              toggleUseCase(u);
            }}
            className={atMax ? "opacity-50" : undefined}
          />
        );
      })}
    </StepScreen>
  );
}

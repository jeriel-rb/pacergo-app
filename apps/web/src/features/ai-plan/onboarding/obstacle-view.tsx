"use client";

import { useTranslation } from "react-i18next";
import {
  Clock,
  BookOpen,
  ZapOff,
  Bandage,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ONBOARDING_OBSTACLES, type OnboardingObstacle } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const OBSTACLE_ICONS: Record<OnboardingObstacle, LucideIcon> = {
  lack_of_time: Clock,
  lack_of_knowledge: BookOpen,
  low_motivation: ZapOff,
  injuries: Bandage,
  lack_of_equipment: Package,
  never_tried: Sparkles,
};

export function ObstacleView() {
  const { t } = useTranslation("onboarding");
  const { answers, setObstacle } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  return (
    <StepScreen
      title={t("obstacle.title")}
      continueLabel={t("continue")}
      continueDisabled={!answers.obstacle}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_OBSTACLES.map((o) => (
        <OptionCard
          key={o}
          icon={OBSTACLE_ICONS[o]}
          title={t(`obstacle.options.${o}`)}
          selected={answers.obstacle === o}
          onSelect={() => setObstacle(o)}
        />
      ))}
    </StepScreen>
  );
}

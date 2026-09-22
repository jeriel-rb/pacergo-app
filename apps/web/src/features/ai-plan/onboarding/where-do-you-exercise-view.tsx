"use client";

import { useTranslation } from "react-i18next";
import { ONBOARDING_GYM_TYPES } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useGymEquipmentNav } from "./gym-equipment-steps";
import { StepScreen } from "./step-screen";

export function WhereDoYouExerciseView() {
  const { t } = useTranslation("onboarding");
  const { gymEquipment, setGymType } = useOnboarding();
  const { goNext, goBack } = useGymEquipmentNav();

  return (
    <StepScreen
      title={t("gymEquipment.whereDoYouExercise.title")}
      continueLabel={t("continue")}
      continueDisabled={!gymEquipment.gymType}
      onContinue={goNext}
      onBack={goBack}
    >
      {ONBOARDING_GYM_TYPES.map((g) => (
        <OptionCard
          key={g}
          multi
          title={t(`gymEquipment.whereDoYouExercise.options.${g}.title`)}
          description={t(`gymEquipment.whereDoYouExercise.options.${g}.description`)}
          selected={gymEquipment.gymType === g}
          onSelect={() => setGymType(g)}
        />
      ))}
    </StepScreen>
  );
}

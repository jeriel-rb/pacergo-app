"use client";

import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { ExerciseArt } from "@/shared/components/atoms/exercise-art";
import { CARDIO_HERO_ART } from "./equipment-images";
import { useGymEquipmentNav } from "./gym-equipment-steps";
import { StepScreen } from "./step-screen";

export function AddCardioView() {
  const { t } = useTranslation("onboarding");
  const { setAddCardio } = useOnboarding();
  const { goToStep, goToFinish, goBack } = useGymEquipmentNav();

  return (
    <StepScreen
      title={t("gymEquipment.addCardio.title")}
      subtitle={t("gymEquipment.addCardio.subtitle")}
      continueLabel={t("gymEquipment.addCardio.yes")}
      continueDisabled={false}
      onContinue={() => {
        setAddCardio(true);
        goToStep("choose-cardio");
      }}
      onBack={goBack}
      secondaryAction={{
        label: t("gymEquipment.addCardio.notNow"),
        onClick: () => {
          setAddCardio(false);
          goToFinish();
        },
      }}
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted">
        <ExerciseArt slug={CARDIO_HERO_ART} className="h-4/5 w-4/5" />
      </div>
    </StepScreen>
  );
}

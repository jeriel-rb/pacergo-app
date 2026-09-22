"use client";

import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { CardioPicker } from "./cardio-picker";
import { useGymEquipmentNav } from "./gym-equipment-steps";
import { StepScreen } from "./step-screen";

export function ChooseCardioView() {
  const { t } = useTranslation("onboarding");
  const { gymEquipment, setCardioPlacement, toggleCardioType } = useOnboarding();
  const { goNext, goBack } = useGymEquipmentNav();

  return (
    <StepScreen
      title={t("gymEquipment.chooseCardio.title")}
      subtitle={t("gymEquipment.chooseCardio.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={gymEquipment.cardioTypes.length === 0}
      onContinue={goNext}
      onBack={goBack}
    >
      <CardioPicker
        placement={gymEquipment.cardioPlacement}
        onPlacementChange={setCardioPlacement}
        selected={gymEquipment.cardioTypes}
        onToggle={toggleCardioType}
      />
    </StepScreen>
  );
}

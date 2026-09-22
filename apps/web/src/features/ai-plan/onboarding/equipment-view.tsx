"use client";

import { useTranslation } from "react-i18next";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { EquipmentPicker } from "./equipment-picker";
import { useGymEquipmentNav } from "./gym-equipment-steps";
import { StepScreen } from "./step-screen";

export function EquipmentView() {
  const { t } = useTranslation("onboarding");
  const { gymEquipment, setGymType, toggleEquipment } = useOnboarding();
  const { goNext, goBack } = useGymEquipmentNav();

  return (
    <StepScreen
      title={t("gymEquipment.equipment.title")}
      subtitle={t("gymEquipment.equipment.subtitle")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={goNext}
      onBack={goBack}
    >
      <EquipmentPicker
        gymType={gymEquipment.gymType}
        selected={gymEquipment.equipment}
        onToggle={toggleEquipment}
        onSelectGymType={setGymType}
      />
    </StepScreen>
  );
}

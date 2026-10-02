"use client";

import { useTranslation } from "react-i18next";
import type { OnboardingUnit } from "@pacergo/shared";
import { WheelPicker } from "@/shared/components/atoms/wheel-picker";
import { Switch } from "@/shared/components/ui/switch";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { useAboutYouNav } from "./about-you-steps";
import { StepScreen } from "./step-screen";

const DEFAULT_HEIGHT_CM = 165;
const DEFAULT_WEIGHT_KG = 62;

const CM_VALUES = Array.from({ length: 220 - 120 + 1 }, (_, i) => 120 + i);
const KG_VALUES = Array.from({ length: 180 - 30 + 1 }, (_, i) => 30 + i);
const FT_VALUES = Array.from({ length: 6 }, (_, i) => 3 + i); // 3–8 ft
const IN_VALUES = Array.from({ length: 12 }, (_, i) => i); // 0–11 in
const LB_VALUES = Array.from({ length: 400 - 66 + 1 }, (_, i) => 66 + i);

function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.min(8, Math.max(3, Math.floor(totalIn / 12)));
  const inches = Math.min(11, Math.max(0, totalIn - ft * 12));
  return { ft, inches };
}
function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}
function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462);
}
function lbToKg(lb: number): number {
  return Math.round(lb / 2.20462);
}

export function HeightWeightView() {
  const { t } = useTranslation("onboarding");
  const { answers, setUnit, setHeightCm, setWeightKg } = useOnboarding();
  const { goNext, goBack } = useAboutYouNav();

  const heightCm = answers.heightCm ?? DEFAULT_HEIGHT_CM;
  const weightKg = answers.weightKg ?? DEFAULT_WEIGHT_KG;
  const bmi = weightKg / (heightCm / 100) ** 2;

  function commitDefaultsIfNeeded() {
    if (answers.heightCm === null) setHeightCm(DEFAULT_HEIGHT_CM);
    if (answers.weightKg === null) setWeightKg(DEFAULT_WEIGHT_KG);
  }

  return (
    <StepScreen
      title={t("heightWeight.title")}
      continueLabel={t("continue")}
      continueDisabled={false}
      onContinue={() => {
        commitDefaultsIfNeeded();
        goNext();
      }}
      onBack={goBack}
    >
      <div className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
        {t("heightWeight.bmiPrefix")}{" "}
        <span className="font-semibold text-success">{bmi.toFixed(1)}</span>
        {t("heightWeight.bmiSuffix")}
      </div>

      <BodyMeasurementsPicker
        unit={answers.unit}
        heightCm={heightCm}
        weightKg={weightKg}
        onUnitChange={setUnit}
        onHeightChange={setHeightCm}
        onWeightChange={setWeightKg}
      />
    </StepScreen>
  );
}

/** Metric/imperial toggle plus height & weight wheels. Values are always
 *  metric; `unit` only picks which wheels are shown. Shared by this step and
 *  the nutrition page's profile editor. */
export function BodyMeasurementsPicker({
  unit,
  heightCm,
  weightKg,
  onUnitChange,
  onHeightChange,
  onWeightChange,
}: {
  unit: OnboardingUnit;
  heightCm: number;
  weightKg: number;
  onUnitChange: (unit: OnboardingUnit) => void;
  onHeightChange: (cm: number) => void;
  onWeightChange: (kg: number) => void;
}) {
  const { t } = useTranslation("onboarding");
  const isMetric = unit === "metric";
  const { ft, inches } = cmToFtIn(heightCm);

  return (
    <>
      <div className="flex items-center justify-center gap-3 py-2 text-sm font-medium">
        <span className={!isMetric ? "text-foreground" : "text-muted-foreground"}>
          {t("heightWeight.imperial")}
        </span>
        <Switch
          checked={isMetric}
          onChange={(checked) => onUnitChange(checked ? "metric" : "imperial")}
          aria-label={t("heightWeight.unitToggle")}
        />
        <span className={isMetric ? "text-foreground" : "text-muted-foreground"}>
          {t("heightWeight.metric")}
        </span>
      </div>

      <div className={`grid gap-2 ${isMetric ? "grid-cols-2" : "grid-cols-3"}`}>
        <div className={isMetric ? "" : "col-span-2"}>
          <p className="mb-2 text-center text-sm font-semibold">
            {t("heightWeight.height")}
          </p>
          {isMetric ? (
            <WheelPicker
              values={CM_VALUES}
              value={heightCm}
              onChange={onHeightChange}
              suffix="cm"
              ariaLabel={t("heightWeight.height")}
            />
          ) : (
            <div className="flex gap-1">
              <WheelPicker
                values={FT_VALUES}
                value={ft}
                onChange={(v) => onHeightChange(ftInToCm(v, inches))}
                suffix="ft"
                ariaLabel={`${t("heightWeight.height")} (ft)`}
                className="flex-1"
              />
              <WheelPicker
                values={IN_VALUES}
                value={inches}
                onChange={(v) => onHeightChange(ftInToCm(ft, v))}
                suffix="in"
                ariaLabel={`${t("heightWeight.height")} (in)`}
                className="flex-1"
              />
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-center text-sm font-semibold">
            {t("heightWeight.weight")}
          </p>
          {isMetric ? (
            <WheelPicker
              values={KG_VALUES}
              value={weightKg}
              onChange={onWeightChange}
              suffix="kg"
              ariaLabel={t("heightWeight.weight")}
            />
          ) : (
            <WheelPicker
              values={LB_VALUES}
              value={kgToLb(weightKg)}
              onChange={(v) => onWeightChange(lbToKg(v))}
              suffix="lb"
              ariaLabel={t("heightWeight.weight")}
            />
          )}
        </div>
      </div>
    </>
  );
}

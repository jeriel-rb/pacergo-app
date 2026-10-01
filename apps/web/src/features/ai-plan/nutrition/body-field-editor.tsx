"use client";

import { useTranslation } from "react-i18next";
import {
  ONBOARDING_GOALS,
  PLAN_GENDERS,
  type OnboardingAnswers,
} from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";
import { WheelPicker } from "@/shared/components/atoms/wheel-picker";
import { ActivityLevelOptions } from "@/features/ai-plan/onboarding/activity-level-options";
import { BodyMeasurementsPicker } from "@/features/ai-plan/onboarding/height-weight-view";

/** The fitness-profile fields AI Nutrition depends on, editable one at a
 *  time — shared by the nutrition build flow (asks only what's missing) and
 *  the result page's edit dialogs. */
export type BodyField = "goal" | "gender" | "age" | "body" | "activityLevel";

/** Wheel-based fields have no single "pick" moment — callers confirm them. */
export const WHEEL_FIELDS: readonly BodyField[] = ["age", "body"];

const AGE_VALUES = Array.from({ length: 90 - 13 + 1 }, (_, i) => 13 + i);
export const BODY_DEFAULTS = { age: 30, heightCm: 175, weightKg: 80 } as const;

/** Fill wheel defaults the user accepted without scrolling. */
export function withBodyDefaults(answers: OnboardingAnswers, field: BodyField): OnboardingAnswers {
  if (field === "age") return { ...answers, age: answers.age ?? BODY_DEFAULTS.age };
  if (field === "body") {
    return {
      ...answers,
      heightCm: answers.heightCm ?? BODY_DEFAULTS.heightCm,
      weightKg: answers.weightKg ?? BODY_DEFAULTS.weightKg,
    };
  }
  return answers;
}

export function BodyFieldEditor({
  field,
  answers,
  onChange,
  onPicked,
}: {
  field: BodyField;
  answers: OnboardingAnswers;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  /** Called after a single-tap choice (goal, gender, activity level). */
  onPicked?: () => void;
}) {
  const { t } = useTranslation("onboarding");
  const pick = (patch: Partial<OnboardingAnswers>) => {
    onChange(patch);
    onPicked?.();
  };

  switch (field) {
    case "goal":
      return (
        <>
          {ONBOARDING_GOALS.map((g) => (
            <OptionCard
              key={g}
              title={t(`goal.options.${g}.title`)}
              description={t(`goal.options.${g}.description`)}
              selected={answers.goal === g}
              onSelect={() => pick({ goal: g })}
            />
          ))}
        </>
      );
    case "gender":
      return (
        <>
          {PLAN_GENDERS.map((g) => (
            <OptionCard
              key={g}
              title={t(`gender.options.${g}`)}
              selected={answers.gender === g}
              onSelect={() => pick({ gender: g })}
            />
          ))}
        </>
      );
    case "age":
      return (
        <div className="flex items-center justify-center gap-3 py-4">
          <WheelPicker
            values={AGE_VALUES}
            value={answers.age ?? BODY_DEFAULTS.age}
            onChange={(age) => onChange({ age })}
            ariaLabel={t("age.title")}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">{t("age.suffix")}</span>
        </div>
      );
    case "body":
      return (
        <BodyMeasurementsPicker
          unit={answers.unit}
          heightCm={answers.heightCm ?? BODY_DEFAULTS.heightCm}
          weightKg={answers.weightKg ?? BODY_DEFAULTS.weightKg}
          onUnitChange={(unit) => onChange({ unit })}
          onHeightChange={(heightCm) => onChange({ heightCm })}
          onWeightChange={(weightKg) => onChange({ weightKg })}
        />
      );
    case "activityLevel":
      return (
        <ActivityLevelOptions
          value={answers.activityLevel}
          onSelect={(activityLevel) => pick({ activityLevel })}
        />
      );
  }
}

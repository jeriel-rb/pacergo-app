"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Calendar, BarChart3, Dumbbell, Layers } from "lucide-react";
import { generateTrainingPlan } from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/features/ai-plan/onboarding-store";
import { fetchAllExercises } from "@/lib/exercises";
import { getCurrentUserId, saveOnboardingAnswers, saveTrainingPlan } from "@/lib/plans";

const BMI_MIN = 15;
const BMI_MAX = 35;

function bmiCategory(bmi: number): {
  key: "underweight" | "healthy" | "overweight" | "obese";
  className: string;
} {
  if (bmi < 18.5) return { key: "underweight", className: "bg-blue-500/15 text-blue-500" };
  if (bmi < 25) return { key: "healthy", className: "bg-success/15 text-success" };
  if (bmi < 30) return { key: "overweight", className: "bg-warning/15 text-warning" };
  return { key: "obese", className: "bg-destructive/15 text-destructive" };
}

export function PlanReadyView() {
  const { t } = useTranslation("onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const {
    answers,
    trainingPreferences,
    gymEquipment,
    generatedPlan,
    setGeneratedPlan,
    markStepComplete,
  } = useOnboarding();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  const heightCm = answers.heightCm ?? 170;
  const weightKg = answers.weightKg ?? 70;
  const bmi = weightKg / (heightCm / 100) ** 2;
  const category = bmiCategory(bmi);
  const bmiPct = Math.min(
    100,
    Math.max(0, ((bmi - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100),
  );

  const isMetric = answers.unit === "metric";
  const weightLabel = isMetric
    ? `${weightKg.toFixed(1)} kg`
    : `${(weightKg * 2.20462).toFixed(1)} lb`;
  const heightLabel = isMetric
    ? `${heightCm} cm`
    : (() => {
        const totalIn = Math.round(heightCm / 2.54);
        return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
      })();

  async function onSavePlan() {
    setSaving(true);
    setError(false);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("Not signed in");

      // Fallback: generation normally already ran on the "Creating your
      // plan" screen; only regenerate here if that somehow didn't happen
      // (e.g. this screen was reached directly).
      let plan = generatedPlan;
      if (!plan) {
        const exercises = await fetchAllExercises();
        plan = generateTrainingPlan({ answers, trainingPreferences, gymEquipment, exercises });
        setGeneratedPlan(plan);
      }

      await saveOnboardingAnswers({ userId, answers, trainingPreferences, gymEquipment });
      const label = answers.goal
        ? t(`goal.options.${answers.goal}.title`)
        : t("gymEquipment.planReady.headline");
      const planId = await saveTrainingPlan({
        userId,
        label,
        plan,
        onboardingSnapshot: { answers, trainingPreferences, gymEquipment },
      });

      markStepComplete("gymEquipment");
      router.push(pathname.replace(/\/plan-ready$/, `/plan/${planId}`));
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 size={26} />
        </span>
        <h1 className="text-2xl font-extrabold leading-snug">
          {t("gymEquipment.planReady.congratulations")}
          <br />
          {t("gymEquipment.planReady.headline")}
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("gymEquipment.planReady.aboutYou")}
        </h2>
        <div className="grid grid-cols-3 gap-x-4 gap-y-4 rounded-2xl bg-muted p-4">
          <Stat label={t("gymEquipment.planReady.age")} value={String(answers.age ?? "—")} />
          <Stat label={t("gymEquipment.planReady.height")} value={heightLabel} />
          <Stat label={t("gymEquipment.planReady.weight")} value={weightLabel} />
          <div className="col-span-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">BMI</span>
              <span className="text-lg font-bold">{bmi.toFixed(2)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                  category.className,
                )}
              >
                {t(`gymEquipment.planReady.bmiCategory.${category.key}`)}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-blue-500 via-success via-40% to-destructive">
              <div
                className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-foreground shadow"
                style={{ left: `${bmiPct}%` }}
                aria-hidden
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{t("gymEquipment.planReady.bmiCategory.underweight")}</span>
              <span>{t("gymEquipment.planReady.bmiCategory.healthy")}</span>
              <span>{t("gymEquipment.planReady.bmiCategory.overweight")}</span>
              <span>{t("gymEquipment.planReady.bmiCategory.obese")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("gymEquipment.planReady.builtForYou")}
        </h2>
        <div className="space-y-3 rounded-2xl bg-muted p-4">
          <div>
            <p className="text-base font-bold">
              {answers.goal ? t(`goal.options.${answers.goal}.title`) : "—"}
            </p>
            {answers.goal && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t(`goal.options.${answers.goal}.description`)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-3 border-t border-border pt-3">
            <IconStat
              icon={Calendar}
              label={t("gymEquipment.planReady.perWeek")}
              value={
                trainingPreferences.daysPerWeek
                  ? t(`trainingPreferences.daysPerWeek.options.${trainingPreferences.daysPerWeek}`)
                  : "—"
              }
            />
            <IconStat
              icon={BarChart3}
              label={t("gymEquipment.planReady.fitnessLevel")}
              value={
                trainingPreferences.experience
                  ? t(`trainingPreferences.experience.options.${trainingPreferences.experience}.title`)
                  : "—"
              }
            />
            <IconStat
              icon={Dumbbell}
              label={t("gymEquipment.planReady.equipment")}
              value={
                gymEquipment.gymType
                  ? t(`gymEquipment.whereDoYouExercise.options.${gymEquipment.gymType}.title`)
                  : "—"
              }
            />
            <IconStat
              icon={Layers}
              label={t("gymEquipment.planReady.workoutSplit")}
              value={
                trainingPreferences.workoutSplit
                  ? t(`trainingPreferences.workoutSplit.options.${trainingPreferences.workoutSplit}.title`)
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="text-center text-sm text-destructive">
          {t("gymEquipment.planReady.saveError")}
        </p>
      )}
      <Button size="lg" className="w-full" onClick={onSavePlan} disabled={saving}>
        {saving ? t("gymEquipment.planReady.saving") : t("gymEquipment.planReady.saveMyPlan")}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function IconStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

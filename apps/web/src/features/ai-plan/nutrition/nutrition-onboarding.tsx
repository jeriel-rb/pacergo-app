"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, Salad } from "lucide-react";
import {
  isPlanGender,
  missingNutritionInputs,
  toFitnessProfile,
  type NutritionInput,
  type OnboardingAnswers,
} from "@pacergo/shared";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/toast";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { ProgressBar } from "@/shared/components/atoms/progress-bar";
import { StepScreen } from "@/features/ai-plan/onboarding/step-screen";
import { saveOnboardingAnswers, skipNutritionPlan } from "@/lib/plans";
import type { SavedFitnessProfile } from "@/lib/fitness-profile-row";
import { BodyFieldEditor, withBodyDefaults, type BodyField } from "./body-field-editor";

const STEP_ORDER: readonly BodyField[] = ["goal", "gender", "age", "body", "activityLevel"];

const INPUT_STEP: Record<NutritionInput, BodyField> = {
  goal: "goal",
  gender: "gender",
  age: "age",
  heightCm: "body",
  weightKg: "body",
  activityLevel: "activityLevel",
};

const STEP_TITLE: Record<BodyField, string> = {
  goal: "goal.title",
  gender: "gender.title",
  age: "age.title",
  body: "heightWeight.title",
  activityLevel: "activityLevel.title",
};

function isAnswered(field: BodyField, answers: OnboardingAnswers): boolean {
  switch (field) {
    case "goal":
      return answers.goal !== null;
    case "gender":
      return isPlanGender(answers.gender);
    case "activityLevel":
      return answers.activityLevel !== null;
    default:
      return true; // wheels always hold a value (defaults applied on Continue)
  }
}

/** AI Nutrition entry: intro with Skip / Build Nutrition Plan. Building
 *  reuses the Shared Fitness Profile and asks only for inputs it's missing
 *  (often none), then saves the result to the account. */
export function NutritionOnboarding({
  userId,
  saved,
  answers: initialAnswers,
  nextHref,
  exitHref,
}: {
  userId: string;
  saved: SavedFitnessProfile;
  answers: OnboardingAnswers;
  /** Where to go after Skip when the intro was offered mid-flow (new plan). */
  nextHref: string | null;
  exitHref: string;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const router = useRouter();
  const toast = useToast();
  const [answers, setAnswers] = React.useState(initialAnswers);
  const [steps, setSteps] = React.useState<BodyField[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [busy, setBusy] = React.useState<"build" | "skip" | null>(null);
  const [error, setError] = React.useState(false);

  async function finish(final: OnboardingAnswers) {
    setBusy("build");
    setError(false);
    try {
      await saveOnboardingAnswers({
        userId,
        answers: final,
        trainingPreferences: saved.trainingPreferences,
        gymEquipment: saved.gymEquipment,
        nutritionStatus: "built",
      });
      toast.show(t("toast.nutritionBuilt"), "success");
      // The page re-renders as the saved result.
      router.refresh();
    } catch {
      setError(true);
      setBusy(null);
      toast.show(t("toast.nutritionBuildFailed"), "destructive");
    }
  }

  function onBuild() {
    const profile = toFitnessProfile(answers, saved.trainingPreferences, saved.gymEquipment);
    const missing = new Set(missingNutritionInputs(profile).map((input) => INPUT_STEP[input]));
    const needed = STEP_ORDER.filter((s) => missing.has(s));
    if (needed.length === 0) {
      void finish(answers);
    } else {
      setSteps(needed);
      setIndex(0);
    }
  }

  async function onSkip() {
    setBusy("skip");
    setError(false);
    try {
      await skipNutritionPlan();
      router.push(nextHref ?? exitHref);
      router.refresh();
    } catch {
      setError(true);
      setBusy(null);
      toast.show(t("toast.nutritionSkipFailed"), "destructive");
    }
  }

  if (steps) {
    const field = steps[index]!;
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-3">
          <h1 className="text-lg font-semibold">{t("nutrition.build.title")}</h1>
          <ProgressBar value={((index + 1) / steps.length) * 100} />
        </div>
        <StepScreen
          title={t(STEP_TITLE[field], { ns: "onboarding" })}
          continueLabel={busy ? t("nutrition.intro.building") : t("continue", { ns: "onboarding" })}
          continueDisabled={busy !== null || !isAnswered(field, answers)}
          onContinue={() => {
            const next = withBodyDefaults(answers, field);
            setAnswers(next);
            if (index + 1 < steps.length) setIndex(index + 1);
            else void finish(next);
          }}
          onBack={() => (index === 0 ? setSteps(null) : setIndex(index - 1))}
        >
          <BodyFieldEditor
            field={field}
            answers={answers}
            onChange={(patch) => setAnswers((prev) => ({ ...prev, ...patch }))}
          />
          {error && <p className="text-sm text-destructive">{t("nutrition.intro.error")}</p>}
        </StepScreen>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Salad size={28} aria-hidden />
        </span>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold">{t("nutrition.intro.title")}</h1>
          <BetaBadge />
        </div>
        <p className="text-base">{t("nutrition.intro.body")}</p>
        <p className="text-sm text-muted-foreground">{t("nutrition.intro.reuse")}</p>
      </div>

      {error && <p className="text-center text-sm text-destructive">{t("nutrition.intro.error")}</p>}

      <div className="space-y-3">
        <Button size="lg" className="w-full" onClick={onBuild} disabled={busy !== null}>
          {busy === "build" && <Loader2 size={16} className="animate-spin" />}
          {busy === "build" ? t("nutrition.intro.building") : t("nutrition.intro.build")}
        </Button>
        <Button size="lg" variant="outline" className="w-full" onClick={onSkip} disabled={busy !== null}>
          {busy === "skip" && <Loader2 size={16} className="animate-spin" />}
          {t("nutrition.intro.skip")}
        </Button>
      </div>
    </div>
  );
}

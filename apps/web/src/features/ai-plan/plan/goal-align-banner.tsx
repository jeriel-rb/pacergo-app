"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  ONBOARDING_GOALS,
  type GymEquipmentAnswers,
  type OnboardingAnswers,
  type OnboardingGoal,
  type TrainingPreferencesAnswers,
} from "@pacergo/shared";
import { saveOnboardingAnswers } from "@/lib/plans";
import { useToast } from "@/shared/components/ui/toast";

/** Soft nudge when this plan's goal and the Shared Fitness Profile disagree.
 *  One tap copies the plan goal into the profile (and refreshes nutrition). */
export function GoalAlignBanner({
  userId,
  planGoal,
  profileGoal,
  answers,
  trainingPreferences,
  gymEquipment,
}: {
  userId: string;
  planGoal: string | null;
  profileGoal: string | null;
  answers: OnboardingAnswers;
  trainingPreferences: TrainingPreferencesAnswers;
  gymEquipment: GymEquipmentAnswers;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  const planOk = planGoal != null && ONBOARDING_GOALS.includes(planGoal as OnboardingGoal);
  const profileOk =
    profileGoal != null && ONBOARDING_GOALS.includes(profileGoal as OnboardingGoal);
  if (!planOk || !profileOk || planGoal === profileGoal) return null;

  const planLabel = t(`goal.options.${planGoal}.title`, { ns: "onboarding" });
  const profileLabel = t(`goal.options.${profileGoal}.title`, { ns: "onboarding" });

  async function onAlign() {
    if (busy || !planOk) return;
    setBusy(true);
    try {
      await saveOnboardingAnswers({
        userId,
        answers: { ...answers, goal: planGoal as OnboardingGoal },
        trainingPreferences,
        gymEquipment,
      });
      toast.show(t("toast.goalAligned"), "success");
      router.refresh();
    } catch {
      toast.show(t("toast.goalAlignFailed"), "destructive");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3.5">
      <p className="text-sm font-medium text-foreground/90">{t("overview.goalAlign.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t("overview.goalAlign.body", { plan: planLabel, profile: profileLabel })}
      </p>
      <button
        type="button"
        onClick={onAlign}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        {busy && <Loader2 size={12} className="animate-spin" aria-hidden />}
        {busy
          ? t("overview.goalAlign.updating")
          : t("overview.goalAlign.cta", { goal: planLabel })}
      </button>
    </div>
  );
}

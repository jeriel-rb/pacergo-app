"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { UserCog } from "lucide-react";
import {
  calculateNutrition,
  missingNutritionInputs,
  nutritionNeedsRecalc,
  toFitnessProfile,
  type OnboardingAnswers,
} from "@pacergo/shared";
import { buttonVariants } from "@/shared/components/ui/button";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { useLocale } from "@/shared/hooks/use-locale";
import { saveOnboardingAnswers } from "@/lib/plans";
import type { SavedFitnessProfile } from "@/lib/fitness-profile-row";
import { cn } from "@/lib/utils";
import { NutritionMissingNotice, NutritionTargetsCard } from "./nutrition-targets-card";

/** The saved AI Nutrition result: daily calories, protein and food guidance.
 *  It only *reads* the Shared Fitness Profile — the inputs behind it are
 *  edited on the Fitness Profile page, so Training and Nutrition never keep
 *  separate copies. If the saved result has gone stale (a profile change made
 *  elsewhere, or revised rules) it's recalculated once when the page opens. */
export function NutritionView({
  userId,
  saved,
  answers,
  nextHref,
}: {
  userId: string;
  saved: SavedFitnessProfile;
  /** Saved answers merged with the account profile's gender. */
  answers: OnboardingAnswers;
  /** Where "Continue" goes when the user arrived from building a plan. */
  nextHref: string | null;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const profile = toFitnessProfile(answers, saved.trainingPreferences, saved.gymEquipment);
  // Calories and protein are always our formula — not user-editable.
  const targets = calculateNutrition(profile);
  const stale = nutritionNeedsRecalc(saved.nutrition, profile);

  const synced = React.useRef(false);
  React.useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (targets && stale) {
      saveOnboardingAnswers({
        userId,
        answers,
        trainingPreferences: saved.trainingPreferences,
        gymEquipment: saved.gymEquipment,
      })
        .then(() => router.refresh())
        .catch(() => {
          // Non-fatal: the result shown is already the up-to-date calculation.
        });
    }
    // Initial-mount check only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileHref = pathname.replace(/\/nutrition$/, "/fitness-profile");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t("nutrition.title")}</h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-muted-foreground">{t("nutrition.subtitle")}</p>
      </div>

      <section className="space-y-3">
        {targets ? (
          <NutritionTargetsCard targets={targets} />
        ) : (
          <NutritionMissingNotice missing={missingNutritionInputs(profile)} />
        )}
        {saved.updatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("nutrition.updatedOn", {
              date: new Date(saved.updatedAt).toLocaleDateString(locale === "zh" ? "zh-TW" : "en"),
            })}
          </p>
        )}
      </section>

      {nextHref && (
        <Link href={nextHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {t("nutrition.continueToPlan")}
        </Link>
      )}

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{t("nutrition.profileTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("nutrition.editInProfile")}</p>
        <Link
          href={profileHref}
          className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
        >
          <UserCog size={16} aria-hidden />
          {t("fitnessProfile.title")}
        </Link>
      </section>
    </div>
  );
}

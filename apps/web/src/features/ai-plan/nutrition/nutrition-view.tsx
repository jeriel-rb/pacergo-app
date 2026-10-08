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
  preservedProteinGrams,
  toFitnessProfile,
  withProteinGrams,
  type OnboardingAnswers,
} from "@pacergo/shared";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  const recommended = calculateNutrition(profile);
  const keptProtein = preservedProteinGrams(saved.nutrition, recommended);
  const targets =
    recommended && keptProtein != null
      ? withProteinGrams(recommended, keptProtein, profile.weightKg ?? 0)
      : recommended;
  const stale = nutritionNeedsRecalc(saved.nutrition, profile);
  const [proteinDraft, setProteinDraft] = React.useState(
    String(keptProtein ?? recommended?.proteinGrams ?? ""),
  );
  const [proteinError, setProteinError] = React.useState(false);
  const [proteinSaving, setProteinSaving] = React.useState<"custom" | "suggested" | null>(null);

  const synced = React.useRef(false);
  React.useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (recommended && stale) {
      // Refresh calories and guidance, but keep a protein target the new
      // formula would replace. The page explains that and offers the new number.
      saveOnboardingAnswers({
        userId,
        answers,
        trainingPreferences: saved.trainingPreferences,
        gymEquipment: saved.gymEquipment,
        proteinGrams: keptProtein,
      })
        .then(() => router.refresh())
        .catch(() => {
          // Non-fatal: the result shown is already the up-to-date calculation.
        });
    }
    // Initial-mount check only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProtein(grams: number | undefined) {
    if (!recommended) return;
    setProteinSaving(grams == null ? "suggested" : "custom");
    setProteinError(false);
    try {
      await saveOnboardingAnswers({
        userId,
        answers,
        trainingPreferences: saved.trainingPreferences,
        gymEquipment: saved.gymEquipment,
        nutritionStatus: "built",
        proteinGrams: grams,
      });
      router.refresh();
    } catch {
      setProteinError(true);
      setProteinSaving(null);
    }
  }

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
        {recommended && keptProtein != null && keptProtein !== recommended.proteinGrams && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm">
              {t("nutrition.proteinKept", {
                saved: keptProtein,
                suggested: recommended.proteinGrams,
                perKg: recommended.proteinGPerKg,
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={proteinSaving !== null}
              onClick={() => void saveProtein(undefined)}
            >
              {t("nutrition.useSuggested")}
            </Button>
          </div>
        )}
        {recommended && (
          <form
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const grams = Number(proteinDraft);
              if (!Number.isFinite(grams) || grams < 10 || grams > 800) {
                setProteinError(true);
                return;
              }
              void saveProtein(grams);
            }}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={10}
              max={800}
              step={5}
              label={t("nutrition.proteinInput")}
              hint={t("nutrition.proteinEditHint")}
              error={proteinError ? t("nutrition.proteinEditError") : undefined}
              value={proteinDraft}
              onChange={(event) => {
                setProteinDraft(event.target.value);
                setProteinError(false);
              }}
            />
            <Button type="submit" className="w-full" disabled={proteinSaving !== null}>
              {t("nutrition.saveProtein")}
            </Button>
          </form>
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

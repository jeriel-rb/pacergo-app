"use client";

import * as React from "react";
import { Check, Dumbbell } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PLAN_SELECTABLE_MUSCLE_GROUPS,
  type OnboardingMuscleGroup,
} from "@pacergo/shared";
import { MUSCLE_FAMILIES, MUSCLE_GROUP_IMAGES } from "@/shared/assets/images";
import { cn } from "@/lib/utils";

const REGIONS = ["upper", "lower"] as const;

/** Image-based muscle picker, one row per family of neighbouring muscles
 *  (shoulders, chest, back, …) under upper/lower body headings. Shared by the "Focused Muscles" and "Excluded Muscles" steps. A muscle can't be both, so `blocked` lists the ones
 *  already chosen in the other list: they stay visible but greyed out, can't be
 *  clicked, and say why (tooltip on hover, a tag underneath for touch screens).
 *  `blockedBy` names that other list. */
export function MuscleGrid({
  selected,
  onToggle,
  max,
  blocked = [],
  blockedBy,
}: {
  selected: readonly OnboardingMuscleGroup[];
  onToggle: (muscle: OnboardingMuscleGroup) => void;
  max: number;
  blocked?: readonly OnboardingMuscleGroup[];
  blockedBy?: "excluded" | "prioritized";
}) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="space-y-6">
      <p className="text-sm font-semibold text-muted-foreground">
        {t("trainingPreferences.muscleSelectedCount", {
          count: selected.length,
          max,
        })}
      </p>

      {REGIONS.map((region) => {
        const families = MUSCLE_FAMILIES.filter((f) => f.region === region)
          .map((f) => ({
            ...f,
            muscles: f.muscles.filter((m) =>
              PLAN_SELECTABLE_MUSCLE_GROUPS.includes(m),
            ),
          }))
          .filter((f) => f.muscles.length > 0);
        return (
          <div key={region} className="space-y-4">
            <h3 className="text-base font-bold">
              {t(`trainingPreferences.muscleRegions.${region}`)}
            </h3>
            {families.map((family) => (
              <div key={family.key} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t(`trainingPreferences.muscleFamilies.${family.key}`)}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {family.muscles.map((muscle) => {
                    const isSelected = selected.includes(muscle);
                    const isBlocked =
                      !isSelected &&
                      blockedBy !== undefined &&
                      blocked.includes(muscle);
                    const disabled =
                      isBlocked || (!isSelected && selected.length >= max);
                    const label = t(`trainingPreferences.muscles.${muscle}`);
                    const blockedReason = isBlocked
                      ? t(`trainingPreferences.muscleBlocked.${blockedBy}`)
                      : undefined;
                    return (
                      // The tooltip lives on the wrapper: a disabled button gets no hover events.
                      <div
                        key={muscle}
                        title={blockedReason}
                        className={cn(
                          "flex justify-center",
                          isBlocked && "cursor-not-allowed",
                        )}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={
                            blockedReason
                              ? `${label} — ${blockedReason}`
                              : undefined
                          }
                          disabled={disabled}
                          onClick={() => onToggle(muscle)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 text-center transition-opacity",
                            disabled && "opacity-40",
                          )}
                        >
                          <span
                            className={cn(
                              // `mix-blend-multiply` turns the source JPGs' white
                              // background into exactly this backdrop color (white
                              // is multiply's identity element), so it always
                              // disappears regardless of the shade chosen here —
                              // but the icon's own gray/blue linework gets darkened
                              // proportional to how dark the backdrop is. A near-
                              // white backdrop in light mode keeps that linework
                              // crisp; a mid-gray (not the app's near-black card)
                              // in dark mode keeps it visible instead of crushed
                              // toward black.
                              "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 bg-neutral-100 dark:bg-neutral-400",
                              isSelected ? "border-primary" : "border-border",
                            )}
                          >
                            <MuscleTileImage
                              src={MUSCLE_GROUP_IMAGES[muscle]}
                            />
                            {isSelected && (
                              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <Check
                                  size={11}
                                  className="text-primary-foreground"
                                  strokeWidth={3}
                                />
                              </span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-semibold leading-tight",
                              isSelected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {label}
                          </span>
                          {isBlocked && (
                            <span className="-mt-1 text-[10px] font-medium leading-none text-muted-foreground">
                              {t(
                                `trainingPreferences.muscleBlockedTag.${blockedBy}`,
                              )}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Some muscle groups are still missing their source artwork on disk (see
 *  `shared/assets/images.ts`) — falls back to a generic icon instead of a
 *  broken-image glyph when the file 404s. */
function MuscleTileImage({ src }: { src: string }) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return <Dumbbell size={22} className="text-muted-foreground" aria-hidden />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- local static asset in public/
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover mix-blend-multiply"
      onError={() => setFailed(true)}
    />
  );
}

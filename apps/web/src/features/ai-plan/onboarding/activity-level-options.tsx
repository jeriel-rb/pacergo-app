"use client";

import { useTranslation } from "react-i18next";
import { Armchair, Flame, Footprints, type LucideIcon } from "lucide-react";
import { ACTIVITY_LEVELS, ACTIVITY_LEVEL_STEPS, type ActivityLevel } from "@pacergo/shared";
import { OptionCard } from "@/shared/components/atoms/option-card";

const ACTIVITY_ICONS: Record<ActivityLevel, LucideIcon> = {
  low: Armchair,
  moderate: Footprints,
  high: Flame,
};

/** The three daily-activity choices, each explained with its typical step
 *  range. Shared by the About You step and the nutrition page's editor. */
export function ActivityLevelOptions({
  value,
  onSelect,
}: {
  value: ActivityLevel | null;
  onSelect: (level: ActivityLevel) => void;
}) {
  const { t } = useTranslation("onboarding");
  const fmt = (n: number | null) => (n === null ? "" : n.toLocaleString());

  return (
    <>
      {ACTIVITY_LEVELS.map((level) => (
        <OptionCard
          key={level}
          icon={ACTIVITY_ICONS[level]}
          title={t(`activityLevel.options.${level}.title`)}
          description={t(`activityLevel.options.${level}.description`, {
            min: fmt(ACTIVITY_LEVEL_STEPS[level].min),
            max: fmt(ACTIVITY_LEVEL_STEPS[level].max),
          })}
          selected={value === level}
          onSelect={() => onSelect(level)}
        />
      ))}
    </>
  );
}

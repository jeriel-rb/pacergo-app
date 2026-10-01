"use client";

import { useTranslation } from "react-i18next";
import { Beef, CheckCircle2, Flame, Info } from "lucide-react";
import type { NutritionInput, NutritionTargets } from "@pacergo/shared";

/** Displays saved/previewed nutrition targets. Pure presentation — every
 *  number comes from @pacergo/shared's calculateNutrition(). */
export function NutritionTargetsCard({ targets }: { targets: NutritionTargets }) {
  const { t } = useTranslation("plan");
  const goal = targets.inputs.goal;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Target
          icon={Flame}
          label={t("nutrition.calories")}
          value={targets.dailyCalories.toLocaleString()}
          unit={t("nutrition.caloriesUnit")}
          detail={t("nutrition.maintenance", { kcal: targets.maintenanceKcal.toLocaleString() })}
        />
        <Target
          icon={Beef}
          label={t("nutrition.protein")}
          value={targets.proteinGrams.toLocaleString()}
          unit={t("nutrition.proteinUnit")}
          detail={t("nutrition.proteinDetail", { perKg: targets.proteinGPerKg })}
        />
      </div>
      {goal && <p className="text-sm text-muted-foreground">{t(`nutrition.goalNote.${goal}`)}</p>}
      {targets.guidance?.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">{t("nutrition.guidanceTitle")}</p>
          <ul className="space-y-2">
            {targets.guidance.map((g) => (
              <li key={g.key} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>{t(`nutrition.guidance.${g.key}`, g.params)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        {t("nutrition.disclaimer")}
      </p>
    </div>
  );
}

function Target({
  icon: Icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon size={14} className="text-primary" aria-hidden />
        {label}
      </p>
      <p className="mt-1">
        <span className="text-3xl font-extrabold tabular-nums">{value}</span>{" "}
        <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/** Shown instead of the card while required profile inputs are missing. */
export function NutritionMissingNotice({ missing }: { missing: NutritionInput[] }) {
  const { t } = useTranslation("plan");
  return (
    <div className="rounded-2xl border border-dashed border-border p-4 text-sm">
      <p>{t("nutrition.missing")}</p>
      {missing.length > 0 && (
        <p className="mt-1 text-muted-foreground">
          {t("nutrition.missingFields", {
            fields: missing.map((f) => t(`nutrition.fields.${f}`)).join(t("update.listSeparator")),
          })}
        </p>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Moon } from "lucide-react";
import {
  ONBOARDING_GOALS,
  PLAN_RULES_VERSION,
  type GeneratedPlan,
  type OnboardingGoal,
} from "@pacergo/shared";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { regeneratePlanUnderCurrentRules } from "@/lib/plans";
import { BetaBadge } from "@/shared/components/atoms/beta-badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/components/ui/toast";
import { useLocale } from "@/shared/hooks/use-locale";
import { NutritionLinkCard } from "@/features/ai-plan/nutrition/nutrition-link-card";

/** A-3 program overview: week tabs + one card per day. All 4 weeks exist up
 *  front ("nothing drip-released"); the exercise mix rotates week to week
 *  according to the plan's Variety setting. */
export function PlanOverviewView({
  planId,
  label,
  goal,
  plan,
}: {
  planId: string;
  label: string;
  /** Promoted column, not the JSONB snapshot — see `plan-view.server.ts`.
   *  Lets the title re-translate live instead of showing whatever language
   *  was active when the plan was saved. `label` is the fallback for older
   *  rows saved before this column existed, or an unrecognized goal. */
  goal: string | null;
  plan: GeneratedPlan;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  // Plans built under older rules (e.g. a plank / glute-bridge "cooldown") can
  // be refreshed in place; the plan's settings stay as they are.
  const outdated = (plan.rulesVersion ?? 0) < PLAN_RULES_VERSION;
  const [updating, setUpdating] = React.useState(false);
  const [updateError, setUpdateError] = React.useState(false);

  async function onUpdateRules() {
    setUpdating(true);
    setUpdateError(false);
    try {
      await regeneratePlanUnderCurrentRules(planId);
      toast.show(t("toast.planRulesUpdated"), "success");
      router.refresh();
    } catch {
      setUpdateError(true);
      toast.show(t("toast.planRulesUpdateFailed"), "destructive");
    } finally {
      setUpdating(false);
    }
  }
  const title =
    goal && ONBOARDING_GOALS.includes(goal as OnboardingGoal)
      ? t(`goal.options.${goal}.title`, { ns: "onboarding" })
      : label;
  const pathname = usePathname();
  // Opens on the week the user came back from (?week=), otherwise week 1.
  const weekParam = Number(useSearchParams().get("week"));
  const [week, setWeek] = React.useState(
    Number.isInteger(weekParam) && weekParam >= 1 && weekParam <= plan.weeks.length ? weekParam : 1,
  );

  const days = plan.weeks[week - 1]?.days ?? [];

  // Say so when the plan builds up week by week (main lifts gain a set later on).
  const firstMainSets = (w: number) =>
    plan.weeks[w]?.days.find((d) => d.session?.main.length)?.session?.main[0]?.sets ?? 0;
  const progresses = plan.weeks.length >= 3 && firstMainSets(2) > firstMainSets(0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={pathname.replace(/\/plan\/[^/]+$/, "/my-plans")}
          aria-label={t("back")}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft size={22} />
        </Link>
        <div className="flex flex-1 items-center gap-2">
          <h1 className="text-lg font-semibold">{title}</h1>
          <BetaBadge />
        </div>
      </div>

      {outdated && (
        <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">{t("overview.outdated.title")}</p>
          <p className="text-xs text-muted-foreground">{t("overview.outdated.body")}</p>
          {updateError && <p className="text-xs text-destructive">{t("overview.outdated.error")}</p>}
          <button
            type="button"
            onClick={onUpdateRules}
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} aria-hidden />}
            {updating ? t("overview.outdated.updating") : t("overview.outdated.cta")}
          </button>
        </div>
      )}

      <NutritionLinkCard href={pathname.replace(/\/plan\/[^/]+$/, "/nutrition")} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {plan.weeks.map((w) => (
          <button
            key={w.weekIndex}
            type="button"
            onClick={() => setWeek(w.weekIndex)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              week === w.weekIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {t("overview.week", { number: w.weekIndex })}
          </button>
        ))}
      </div>

      {progresses && <p className="-mt-3 text-xs text-muted-foreground">{t("weekProgress")}</p>}

      {/* A flex column with a gap: the day cards are wrapped in <a> links, which
          are inline and would ignore vertical margins (space-y-*), leaving the
          cards touching. */}
      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const focusLabel = day.session
            ? t(`overview.focus.${day.session.focus}`)
            : null;
          const content = (
            <div
              className={cn(
                "flex items-center justify-between rounded-2xl border border-border px-4 py-3.5",
                day.isRestDay ? "bg-muted/40" : "bg-card hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    day.isRestDay
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {day.isRestDay ? <Moon size={16} /> : <span className="text-sm font-bold">{day.dayIndex + 1}</span>}
                </span>
                <div>
                  <p className="text-sm font-semibold">{day.dayLabel[locale]}</p>
                  <p className="text-xs text-muted-foreground">
                    {day.isRestDay
                      ? t("overview.restDay")
                      : `${focusLabel} · ${t("overview.minutes", { count: plan.sessionDurationMin })}`}
                  </p>
                </div>
              </div>
              {!day.isRestDay && <ChevronRight size={18} className="text-muted-foreground" />}
            </div>
          );
          return day.isRestDay ? (
            <div key={day.dayIndex}>{content}</div>
          ) : (
            <Link key={day.dayIndex} href={`${pathname}/day/${day.dayIndex}?week=${week}`}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

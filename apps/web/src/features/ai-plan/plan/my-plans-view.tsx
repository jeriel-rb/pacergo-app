"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { MoreVertical, Pencil, Trash2, ClipboardList, Star, Plus } from "lucide-react";
import { ONBOARDING_GOALS, type OnboardingGoal } from "@pacergo/shared";
import { ConfirmDialog } from "@/shared/components/atoms/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useLocale } from "@/shared/hooks/use-locale";
import { deleteTrainingPlan, setActiveTrainingPlan } from "@/lib/plans";
import { aiPlanHref } from "@/lib/ai-plan-path";
import { useToast } from "@/shared/components/ui/toast";
import { NutritionLinkCard } from "@/features/ai-plan/nutrition/nutrition-link-card";
import { FitnessProfileLinkCard } from "@/features/ai-plan/fitness-profile/fitness-profile-link-card";
import type { SavedPlanSummaryServer } from "@/lib/plan-view.server";

/** Lists every plan the user has saved — view or delete each independently
 *  (this app supports several saved plans, not a single replaced-in-place
 *  one; see the "Save My Plan" flow). */
export function MyPlansView({
  plans: initialPlans,
  activePlanId: initialActiveId,
}: {
  plans: SavedPlanSummaryServer[];
  /** The plan AI Training opens and Home progress follows. */
  activePlanId: string | null;
}) {
  const { t } = useTranslation(["plan", "onboarding"]);
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [plans, setPlans] = React.useState(initialPlans);
  const [activeId, setActiveId] = React.useState(initialActiveId);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  function planHref(id: string) {
    return aiPlanHref(pathname, `/plan/${id}`);
  }

  // Live-translated title from the promoted `goal` column — `label` (the
  // string frozen at save time in whatever locale was active then) is only
  // the fallback for older rows or an unrecognized goal.
  function planTitle(p: SavedPlanSummaryServer): string {
    return p.goal && ONBOARDING_GOALS.includes(p.goal as OnboardingGoal)
      ? t(`goal.options.${p.goal}.title`, { ns: "onboarding" })
      : p.label;
  }

  async function onConfirmDelete() {
    if (!pendingDeleteId) return;
    await deleteTrainingPlan(pendingDeleteId);
    const remaining = plans.filter((p) => p.id !== pendingDeleteId);
    setPlans(remaining);
    // Deleting the active plan falls back to the newest remaining one
    // (active_training_plan_id()); none left → setup offers to rebuild it.
    if (pendingDeleteId === activeId) setActiveId(remaining[0]?.id ?? null);
    setPendingDeleteId(null);
    router.refresh();
  }

  async function onSetActive(id: string) {
    try {
      await setActiveTrainingPlan(id);
      setActiveId(id);
      toast.show(t("myPlans.activeSet"), "success");
      router.refresh();
    } catch {
      toast.show(t("myPlans.activeSetError"), "destructive");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("myPlans.title")}</h1>
        {/* Home → AI plan opens the active plan, so starting another one lives here. */}
        {plans.length > 0 && (
          <Link
            href={aiPlanHref(pathname, "/new")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={16} aria-hidden />
            {t("myPlans.newPlan")}
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <NutritionLinkCard href={aiPlanHref(pathname, "/nutrition")} />
        <FitnessProfileLinkCard href={aiPlanHref(pathname, "/fitness-profile")} />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <ClipboardList size={28} className="text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("myPlans.empty")}</p>
          <Link
            href={aiPlanHref(pathname, "/setup")}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("myPlans.createPlan")}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <Link href={planHref(p.id)} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {planTitle(p)}
                  {p.id === activeId && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {t("myPlans.active")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("myPlans.createdOn", {
                    date: new Date(p.createdAt).toLocaleDateString(
                      locale === "zh" ? "zh-TW" : "en-US",
                    ),
                  })}
                </p>
              </Link>
              <Popover
                open={openMenuId === p.id}
                onOpenChange={(open) => setOpenMenuId(open ? p.id : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("myPlans.options")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <MoreVertical size={18} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1">
                  {p.id !== activeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        void onSetActive(p.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Star size={16} className="text-muted-foreground" />
                      {t("myPlans.setActive")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuId(null);
                      router.push(`${planHref(p.id)}/update`);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Pencil size={16} className="text-muted-foreground" />
                    {t("update.cta")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuId(null);
                      setPendingDeleteId(p.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                    {t("myPlans.delete")}
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title={t("myPlans.deleteConfirmTitle")}
        description={t("myPlans.deleteConfirmBody")}
        confirmLabel={t("myPlans.delete")}
        cancelLabel={t("myPlans.cancel")}
        destructive
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

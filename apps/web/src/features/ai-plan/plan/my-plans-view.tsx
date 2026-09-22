"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { MoreVertical, Pencil, Trash2, ClipboardList } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/atoms/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useLocale } from "@/shared/hooks/use-locale";
import { deleteTrainingPlan } from "@/lib/plans";
import type { SavedPlanSummaryServer } from "@/lib/plan-view.server";

/** Lists every plan the user has saved — view or delete each independently
 *  (this app supports several saved plans, not a single replaced-in-place
 *  one; see the "Save My Plan" flow). */
export function MyPlansView({ plans: initialPlans }: { plans: SavedPlanSummaryServer[] }) {
  const { t } = useTranslation("plan");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [plans, setPlans] = React.useState(initialPlans);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  function planHref(id: string) {
    return pathname.replace(/\/my-plans$/, `/plan/${id}`);
  }

  async function onConfirmDelete() {
    if (!pendingDeleteId) return;
    await deleteTrainingPlan(pendingDeleteId);
    setPlans((prev) => prev.filter((p) => p.id !== pendingDeleteId));
    setPendingDeleteId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("myPlans.title")}</h1>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <ClipboardList size={28} className="text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("myPlans.empty")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
              <Link href={planHref(p.id)} className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.label}</p>
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
                <PopoverContent align="end" className="w-48 p-1">
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

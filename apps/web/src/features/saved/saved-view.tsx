"use client";

import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { TrainerGrid } from "@/features/trainer/trainer-grid";

/** "Saved ⭐" page body — the user's favorited trainers (all stars filled). */
export function SavedView({ trainers }: { trainers: TrainerSummary[] }) {
  const { t } = useTranslation("profile");
  const savedIds = trainers.map((tr) => tr.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("savedTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("savedSubtitle")}</p>
      </div>

      {trainers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Star size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("savedEmpty")}</p>
        </div>
      ) : (
        <TrainerGrid trainers={trainers} savedIds={savedIds} />
      )}
    </div>
  );
}

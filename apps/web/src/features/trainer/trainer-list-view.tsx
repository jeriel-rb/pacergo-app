"use client";

import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { TrainerGrid } from "./trainer-grid";

/** Full trainer listing page (陪練師 tab). */
export function TrainerListView({
  trainers,
  savedIds,
}: {
  trainers: TrainerSummary[];
  savedIds?: string[];
}) {
  const { t } = useTranslation("trainer");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("listTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("listSubtitle")}</p>
      </div>
      <TrainerGrid trainers={trainers} savedIds={savedIds} />
    </div>
  );
}

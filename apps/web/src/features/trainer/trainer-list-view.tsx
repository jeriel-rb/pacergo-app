"use client";

import { useState } from "react";
import { LayoutList, Map } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { NearbyView } from "@/features/nearby/nearby-view";
import { cn } from "@/lib/utils";
import { TrainerGrid } from "./trainer-grid";

/** Full trainer listing page (陪練師 tab) — list feed or nearby map. */
export function TrainerListView({
  trainers,
  savedIds,
}: {
  trainers: TrainerSummary[];
  savedIds?: string[];
}) {
  const { t } = useTranslation("trainer");
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t("listTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("listSubtitle")}</p>
        </div>
        <div className="flex shrink-0 rounded-full border border-border p-0.5">
          <ToggleButton active={view === "list"} onClick={() => setView("list")}>
            <LayoutList size={15} />
            {t("viewList")}
          </ToggleButton>
          <ToggleButton active={view === "map"} onClick={() => setView("map")}>
            <Map size={15} />
            {t("viewMap")}
          </ToggleButton>
        </div>
      </div>

      {view === "list" ? (
        <TrainerGrid trainers={trainers} savedIds={savedIds} />
      ) : (
        <NearbyView />
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Small "Soon" pill marking features that aren't built yet. */
export function SoonBadge({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex items-center rounded-full border border-border bg-card/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur",
        className,
      )}
    >
      {t("soon")}
    </span>
  );
}

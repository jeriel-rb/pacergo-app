"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Small "Beta" pill marking live features still in beta (e.g. A-8's naming rule). */
export function BetaBadge({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur",
        className,
      )}
    >
      {t("beta")}
    </span>
  );
}

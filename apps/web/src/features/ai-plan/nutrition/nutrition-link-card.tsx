"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Salad } from "lucide-react";

/** Entry row into the saved nutrition targets (`/ai-plan/nutrition`). */
export function NutritionLinkCard({ href }: { href: string }) {
  const { t } = useTranslation("plan");
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Salad size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{t("nutrition.cardTitle")}</span>
        <span className="block text-xs text-muted-foreground">{t("nutrition.viewCta")}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

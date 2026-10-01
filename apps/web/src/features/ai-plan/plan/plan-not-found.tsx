"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { FileQuestion } from "lucide-react";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";

/** A plan link that no longer resolves (deleted, or someone else's) — never a
 *  dead end: back to the active plan (or setup, if there's none) or the list. */
export function PlanNotFound() {
  const { t } = useTranslation("plan");
  const locale = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
      <FileQuestion size={28} className="text-muted-foreground/60" aria-hidden />
      <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={getLocalizedPath("/ai-plan", locale)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("openCurrentPlan")}
        </Link>
        <Link
          href={getLocalizedPath("/ai-plan/my-plans", locale)}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
        >
          {t("myPlans.title")}
        </Link>
      </div>
    </div>
  );
}

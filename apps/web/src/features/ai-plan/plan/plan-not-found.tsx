"use client";

import { useTranslation } from "react-i18next";
import { FileQuestion } from "lucide-react";

export function PlanNotFound() {
  const { t } = useTranslation("plan");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
      <FileQuestion size={28} className="text-muted-foreground/60" aria-hidden />
      <p className="text-sm text-muted-foreground">{t("notFound")}</p>
    </div>
  );
}

"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PlatformManager } from "@pacergo/shared";
import { useLocale } from "@/shared/hooks/use-locale";

/** Amber "platform manager" assurance card (平台特約經理人). */
export function PlatformManagerCard({ manager }: { manager: PlatformManager }) {
  const { t } = useTranslation("trainer");
  const locale = useLocale();

  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <ShieldCheck size={18} />
        <h2 className="text-base font-semibold">{t("manager")}</h2>
      </div>
      <p className="mt-3 text-lg font-bold text-foreground">{manager.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t("managerRegion")}：{manager.region}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">
        {locale === "zh" ? manager.note_zh : manager.note_en}
      </p>
    </div>
  );
}

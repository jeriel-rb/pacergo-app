"use client";

import { Hammer } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Placeholder body for tabs that are not built yet (社群 / 訊息 / 我的). */
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation(["nav", "common"]);
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
        <Hammer size={28} />
      </span>
      <h1 className="mt-5 text-xl font-bold">{t(`nav:${titleKey}`)}</h1>
      <span className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
        {t("common:comingSoon")}
      </span>
      <p className="mt-3 max-w-xs text-sm text-muted-foreground">
        {t("common:comingSoonNote")}
      </p>
    </div>
  );
}

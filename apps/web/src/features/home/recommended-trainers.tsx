"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { TrainerGrid } from "@/features/trainer/trainer-grid";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

/** Home "推薦陪練師" section: heading + view-all link + the shared trainer grid. */
export function RecommendedTrainers({
  trainers,
}: {
  trainers: TrainerSummary[];
}) {
  const { t } = useTranslation("home");
  const pathname = usePathname();
  const viewAllHref = getLocalizedPath("/trainers", getCurrentLocale(pathname));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("recommended")}</h2>
        <Link
          href={viewAllHref}
          className="inline-flex items-center text-sm font-medium text-primary"
        >
          {t("viewAll")}
          <ChevronRight size={16} />
        </Link>
      </div>
      <TrainerGrid trainers={trainers} />
    </section>
  );
}

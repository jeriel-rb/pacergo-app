"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { CategoryFilter } from "./category-filter";
import { TrainerCard } from "./trainer-card";
import { filterTrainers, type TrainerCategory } from "./filter-trainers";

/** Recommended-trainers section: category filter + responsive card grid. */
export function RecommendedTrainers({
  trainers,
  heading,
  showViewAll = true,
}: {
  trainers: TrainerSummary[];
  heading?: string;
  showViewAll?: boolean;
}) {
  const { t, i18n } = useTranslation("home");
  const locale = i18n.language.startsWith("zh") ? "zh" : "en";
  const [category, setCategory] = useState<TrainerCategory>("all");
  const visible = filterTrainers(trainers, category);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{heading ?? t("recommended")}</h2>
        {showViewAll && (
          <button
            type="button"
            className="inline-flex items-center text-sm font-medium text-primary"
          >
            {t("viewAll")}
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <CategoryFilter value={category} onChange={setCategory} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((trainer) => (
          <TrainerCard key={trainer.id} trainer={trainer} locale={locale} />
        ))}
      </div>
    </section>
  );
}

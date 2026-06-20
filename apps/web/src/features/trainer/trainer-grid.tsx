"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TrainerSummary } from "@pacergo/shared";
import { CategoryFilter } from "@/features/home/category-filter";
import { TrainerCard } from "@/features/home/trainer-card";
import {
  filterTrainers,
  type TrainerCategory,
} from "@/features/home/filter-trainers";

/** Category filter + responsive card grid. Shared by the home feed and list page. */
export function TrainerGrid({ trainers }: { trainers: TrainerSummary[] }) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("zh") ? "zh" : "en";
  const [category, setCategory] = useState<TrainerCategory>("all");
  const visible = filterTrainers(trainers, category);

  return (
    <div className="space-y-4">
      <CategoryFilter value={category} onChange={setCategory} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((trainer) => (
          <TrainerCard key={trainer.id} trainer={trainer} locale={locale} />
        ))}
      </div>
    </div>
  );
}

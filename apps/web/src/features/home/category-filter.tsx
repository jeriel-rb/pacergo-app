"use client";

import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActivitySlug } from "@pacergo/shared";
import { ActivityIcon } from "@/shared/components/atoms/activity";
import { cn } from "@/lib/utils";
import type { TrainerCategory } from "./filter-trainers";

const CATEGORIES: { key: string; value: TrainerCategory; slug?: ActivitySlug }[] = [
  { key: "all", value: "all" },
  { key: "gym", value: "gym", slug: "gym" },
  { key: "walking", value: "walking", slug: "walking" },
  { key: "running", value: "running", slug: "running" },
  { key: "hiking", value: "hiking", slug: "hiking" },
  { key: "hyrox", value: "hyrox", slug: "hyrox" },
];

/** Segmented activity filter (全部 / 健身 / 健走 / 陪跑 / 陪爬 / Hyrox). */
export function CategoryFilter({
  value,
  onChange,
}: {
  value: TrainerCategory;
  onChange: (value: TrainerCategory) => void;
}) {
  const { t } = useTranslation("home");

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      {CATEGORIES.map((cat) => {
        const active = cat.value === value;
        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onChange(cat.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            {cat.slug ? (
              <ActivityIcon slug={cat.slug} size={16} />
            ) : (
              <LayoutGrid size={16} />
            )}
            {t(`category.${cat.key}`)}
          </button>
        );
      })}
    </div>
  );
}

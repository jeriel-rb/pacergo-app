"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  EQUIPMENT_CATALOG,
  ONBOARDING_GYM_TYPES,
  type OnboardingEquipment,
  type OnboardingGymType,
} from "@pacergo/shared";
import { cn } from "@/lib/utils";
import { useLocale } from "@/shared/hooks/use-locale";
import { ListOptionGroup, ListOptionRow } from "@/shared/components/atoms/list-option-row";
import { FilterPill } from "@/shared/components/atoms/filter-pill";
import { EQUIPMENT_ART } from "./equipment-images";
import {
  buildEquipmentSections,
  type EquipmentShow,
  type EquipmentSort,
} from "./equipment-filter";

const SORTS: readonly EquipmentSort[] = ["category", "name"];
const SHOWS: readonly EquipmentShow[] = ["all", "selected", "unselected"];

/** Equipment picker: search + sort/filter, gym-type preset chips, and the
 *  equipment grouped by category with a checkmark per row. Used as the
 *  onboarding "Equipment" step and inside the "Update preferences" dialog.
 *
 *  Tapping a gym-type chip is a preset — the parent replaces the selection
 *  with that gym's typical kit (see `withGymType` in @pacergo/shared) and the
 *  user then fine-tunes row by row. `scrollable` makes only the list scroll
 *  (search + chips stay pinned), for use inside a fixed-height dialog. */
export function EquipmentPicker({
  gymType,
  selected,
  onToggle,
  onSelectGymType,
  scrollable = false,
}: {
  gymType: OnboardingGymType | null;
  selected: readonly OnboardingEquipment[];
  onToggle: (equipment: OnboardingEquipment) => void;
  onSelectGymType: (gymType: OnboardingGymType) => void;
  scrollable?: boolean;
}) {
  const { t } = useTranslation("onboarding");
  const locale = useLocale();
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<EquipmentSort>("category");
  const [show, setShow] = React.useState<EquipmentShow>("all");
  const [filterOpen, setFilterOpen] = React.useState(false);

  const nameOf = React.useCallback(
    (id: OnboardingEquipment) => t(`gymEquipment.equipment.options.${id}.title`),
    [t],
  );

  const sections = React.useMemo(
    () => buildEquipmentSections({ query, show, sort, selected, nameOf, locale }),
    [query, show, sort, selected, nameOf, locale],
  );

  const filtersActive = sort !== "category" || show !== "all";

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", scrollable && "h-full")}>
      <div className="shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("gymEquipment.equipment.search.placeholder")}
              aria-label={t("gymEquipment.equipment.search.placeholder")}
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("gymEquipment.equipment.search.clear")}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-label={t("gymEquipment.equipment.filter.button")}
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors",
              filterOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            <SlidersHorizontal size={18} aria-hidden />
            {filtersActive && (
              <span
                aria-hidden
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
              />
            )}
          </button>
        </div>

        {filterOpen && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("gymEquipment.equipment.filter.sortLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <FilterPill key={s} active={sort === s} onClick={() => setSort(s)} className="py-1.5">
                    {t(`gymEquipment.equipment.filter.sort.${s}`)}
                  </FilterPill>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("gymEquipment.equipment.filter.showLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SHOWS.map((s) => (
                  <FilterPill key={s} active={show === s} onClick={() => setShow(s)} className="py-1.5">
                    {t(`gymEquipment.equipment.filter.show.${s}`)}
                  </FilterPill>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          role="group"
          aria-label={t("gymEquipment.equipment.presetsLabel")}
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ONBOARDING_GYM_TYPES.map((g) => (
            <FilterPill key={g} active={gymType === g} onClick={() => onSelectGymType(g)}>
              {t(`gymEquipment.whereDoYouExercise.options.${g}.title`)}
            </FilterPill>
          ))}
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("gymEquipment.equipment.selectedCount", {
            selected: selected.length,
            total: EQUIPMENT_CATALOG.length,
          })}
        </p>
      </div>

      <div className={cn("space-y-4", scrollable && "min-h-0 flex-1 overflow-y-auto pb-6")}>
        {sections.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query.trim()
              ? t("gymEquipment.equipment.search.empty", { query: query.trim() })
              : t("gymEquipment.equipment.search.emptyFiltered")}
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.category ?? "all"} className="space-y-2">
              {section.category && (
                <p className="text-sm font-semibold text-muted-foreground">
                  {t(`gymEquipment.equipment.categories.${section.category}`)}
                </p>
              )}
              <ListOptionGroup>
                {section.items.map((id) => (
                  <ListOptionRow
                    key={id}
                    multi
                    art={EQUIPMENT_ART[id]}
                    title={nameOf(id)}
                    description={
                      t(`gymEquipment.equipment.options.${id}.description`, { defaultValue: "" }) ||
                      undefined
                    }
                    selected={selected.includes(id)}
                    onSelect={() => onToggle(id)}
                  />
                ))}
              </ListOptionGroup>
            </div>
          ))
        )}

      </div>
    </div>
  );
}

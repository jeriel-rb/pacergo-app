"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EQUIPMENT_PRESETS, ONBOARDING_GYM_TYPES, type OnboardingGymType } from "@pacergo/shared";
import { EXERCISE_CATALOG } from "@/shared/assets/exercise-catalog";
import { availableExercises } from "@/features/ai-plan/onboarding/equipment-exercises";
import { ExerciseArt } from "@/shared/components/atoms/exercise-art";
import { FilterPill } from "@/shared/components/atoms/filter-pill";
import { Button } from "@/shared/components/ui/button";
import { ExerciseDetailDialog } from "./exercise-detail-dialog";
import { useExerciseLabels } from "./use-exercise-labels";
import {
  LIBRARY_FILTERS_DEFAULT,
  activeFilterCount,
  distinctValues,
  filterExercises,
  type LibraryFilters,
  type LibraryKind,
  type LibrarySort,
} from "./library-filter";

const PAGE_SIZE = 24;
const SORTS: readonly LibrarySort[] = ["name", "muscle", "equipment"];
const KINDS: readonly LibraryKind[] = ["all", "exercises", "stretches"];

/** Which exercises each gym type can do with its default kit, so the gym-type
 *  filter (and its counts) is a lookup rather than a recompute per render. */
const slugsFor = (g: OnboardingGymType): ReadonlySet<string> =>
  new Set(availableExercises(EQUIPMENT_PRESETS[g], g).map((e) => e.slug));

const GYM_SLUGS: Record<OnboardingGymType, ReadonlySet<string>> = {
  large_gym: slugsFor("large_gym"),
  small_gym: slugsFor("small_gym"),
  garage_gym: slugsFor("garage_gym"),
  bodyweight_only: slugsFor("bodyweight_only"),
};

const EQUIPMENT_VALUES = distinctValues(EXERCISE_CATALOG, (e) => e.equipment);
const MUSCLE_VALUES = distinctValues(EXERCISE_CATALOG, (e) => e.primaryMuscle);

/** Browsable library of every illustrated exercise: search, equipment chips,
 *  a sort/filter panel (muscle group, exercises vs stretches, sort order), a
 *  card grid that loads as you scroll, and a dialog with the animated
 *  illustration. */
export function ExerciseLibraryView() {
  const { t } = useTranslation(["plan", "onboarding"]);
  const { nameOf, labelOf, locale } = useExerciseLabels();
  const router = useRouter();
  const [filters, setFilters] = React.useState<LibraryFilters>(LIBRARY_FILTERS_DEFAULT);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);

  const results = React.useMemo(
    () =>
      filterExercises(EXERCISE_CATALOG, filters, {
        nameOf,
        labelOf,
        locale,
        gymSlugs: filters.gym ? GYM_SLUGS[filters.gym] : null,
      }),
    [filters, nameOf, labelOf, locale],
  );

  // Back to the first page whenever the result set changes.
  React.useEffect(() => setLimit(PAGE_SIZE), [filters]);

  // Load the next page as the sentinel nears the viewport, so we never mount
  // (and fetch art for) every card at once.
  const sentinel = React.useRef<HTMLDivElement | null>(null);
  const hasMore = limit < results.length;
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setLimit((n) => n + PAGE_SIZE),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit]);

  const patch = (p: Partial<LibraryFilters>) => setFilters((f) => ({ ...f, ...p }));
  const filterCount = activeFilterCount(filters);
  const opened = openSlug ? EXERCISE_CATALOG.find((e) => e.slug === openSlug) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t("back")}
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent md:hidden"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">{t("library.title")}</h1>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder={t("library.search")}
              aria-label={t("library.search")}
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => patch({ query: "" })}
                aria-label={t("library.clearSearch")}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-expanded={panelOpen}
            aria-label={t("library.filterButton")}
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors",
              panelOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
          >
            <SlidersHorizontal size={18} aria-hidden />
            {filterCount > 0 && (
              <span
                aria-hidden
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
              />
            )}
          </button>
        </div>

        {panelOpen && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-3">
            <FilterGroup label={t("library.muscleLabel")}>
              <FilterPill
                active={filters.muscle === null}
                onClick={() => patch({ muscle: null })}
                className="py-1.5"
              >
                {t("library.allMuscles")}
              </FilterPill>
              {MUSCLE_VALUES.map((m) => (
                <FilterPill
                  key={m}
                  active={filters.muscle === m}
                  onClick={() => patch({ muscle: filters.muscle === m ? null : m })}
                  className="py-1.5"
                >
                  {labelOf("muscle", m)}
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label={t("library.gymLabel")}>
              <FilterPill
                active={filters.gym === null}
                onClick={() => patch({ gym: null })}
                className="py-1.5"
              >
                {t("library.gymAll")}
              </FilterPill>
              {ONBOARDING_GYM_TYPES.map((g) => (
                <FilterPill
                  key={g}
                  active={filters.gym === g}
                  onClick={() => patch({ gym: filters.gym === g ? null : g })}
                  className="py-1.5"
                >
                  {t(`gymEquipment.whereDoYouExercise.options.${g}.title`, { ns: "onboarding" })}
                  <span className="ml-1.5 text-xs opacity-70">{GYM_SLUGS[g].size}</span>
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label={t("library.kindLabel")}>
              {KINDS.map((k) => (
                <FilterPill
                  key={k}
                  active={filters.kind === k}
                  onClick={() => patch({ kind: k })}
                  className="py-1.5"
                >
                  {t(`library.kind.${k}`)}
                </FilterPill>
              ))}
            </FilterGroup>
            <FilterGroup label={t("library.sortLabel")}>
              {SORTS.map((s) => (
                <FilterPill
                  key={s}
                  active={filters.sort === s}
                  onClick={() => patch({ sort: s })}
                  className="py-1.5"
                >
                  {t(`library.sort.${s}`)}
                </FilterPill>
              ))}
            </FilterGroup>
          </div>
        )}

        <div
          role="group"
          aria-label={t("library.equipmentLabel")}
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <FilterPill active={filters.equipment === null} onClick={() => patch({ equipment: null })}>
            {t("library.allEquipment")}
          </FilterPill>
          {EQUIPMENT_VALUES.map((eq) => (
            <FilterPill
              key={eq}
              active={filters.equipment === eq}
              onClick={() => patch({ equipment: filters.equipment === eq ? null : eq })}
            >
              {labelOf("equipment", eq)}
            </FilterPill>
          ))}
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("library.results", { count: results.length })}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">{t("library.empty")}</p>
          <Button variant="outline" onClick={() => setFilters(LIBRARY_FILTERS_DEFAULT)}>
            {t("library.clearFilters")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.slice(0, limit).map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => setOpenSlug(e.slug)}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted">
                <ExerciseArt slug={e.slug} className="h-full w-full" />
              </span>
              <span className="min-w-0 px-0.5">
                <span className="line-clamp-2 block text-sm font-semibold leading-snug">
                  {nameOf(e)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {labelOf("equipment", e.equipment)} · {labelOf("muscle", e.primaryMuscle)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinel} className="flex justify-center py-2">
          <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            {t("library.showMore")}
          </Button>
        </div>
      )}

      <ExerciseDetailDialog exercise={opened ?? null} onClose={() => setOpenSlug(null)} />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

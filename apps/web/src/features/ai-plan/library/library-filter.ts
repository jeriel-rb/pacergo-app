import type { OnboardingGymType } from "@pacergo/shared";
import type { ExerciseCatalogEntry } from "@/shared/assets/exercise-catalog";

export type LibrarySort = "name" | "muscle" | "equipment";
export type LibraryKind = "all" | "exercises" | "stretches";

export interface LibraryFilters {
  query: string;
  /** Catalog `equipment` value (e.g. "Barbell"), or null for any. */
  equipment: string | null;
  /** Catalog `primaryMuscle` value (e.g. "Chest"), or null for any. */
  muscle: string | null;
  kind: LibraryKind;
  /** Only exercises this gym type can do with its typical kit (see
   *  `availableExercises`), or null for any. */
  gym: OnboardingGymType | null;
  sort: LibrarySort;
}

export const LIBRARY_FILTERS_DEFAULT: LibraryFilters = {
  query: "",
  equipment: null,
  muscle: null,
  kind: "all",
  gym: null,
  sort: "name",
};

/** Stable i18n-key form of a catalog value: "Pull-up Bar" → "pull_up_bar". */
export function libraryKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** How many filters (besides search) differ from the default — drives the
 *  dot on the filter button. */
export function activeFilterCount(f: LibraryFilters): number {
  return (
    (f.equipment ? 1 : 0) +
    (f.muscle ? 1 : 0) +
    (f.kind !== "all" ? 1 : 0) +
    (f.gym ? 1 : 0) +
    (f.sort !== "name" ? 1 : 0)
  );
}

/** Search + filter + sort the catalog. `nameOf` is the localized display
 *  name; search also matches the English name so zh users can type either.
 *  `labelOf` maps a catalog equipment/muscle value to its localized label
 *  (used for the muscle/equipment sorts). */
export function filterExercises(
  entries: readonly ExerciseCatalogEntry[],
  filters: LibraryFilters,
  {
    nameOf,
    labelOf,
    locale,
    gymSlugs,
  }: {
    nameOf: (e: ExerciseCatalogEntry) => string;
    labelOf: (kind: "equipment" | "muscle", value: string) => string;
    locale: string;
    /** Slugs available in `filters.gym` (required when a gym filter is set). */
    gymSlugs?: ReadonlySet<string> | null;
  },
): ExerciseCatalogEntry[] {
  const needle = filters.query.trim().toLocaleLowerCase(locale);

  const matches = entries.filter((e) => {
    if (filters.equipment && e.equipment !== filters.equipment) return false;
    if (filters.muscle && e.primaryMuscle !== filters.muscle) return false;
    if (filters.kind === "exercises" && e.isStretch) return false;
    if (filters.kind === "stretches" && !e.isStretch) return false;
    if (filters.gym && gymSlugs && !gymSlugs.has(e.slug)) return false;
    if (!needle) return true;
    return (
      nameOf(e).toLocaleLowerCase(locale).includes(needle) ||
      e.name.toLocaleLowerCase(locale).includes(needle)
    );
  });

  const byName = (a: ExerciseCatalogEntry, b: ExerciseCatalogEntry) =>
    nameOf(a).localeCompare(nameOf(b), locale);

  return matches.sort((a, b) => {
    if (filters.sort === "muscle") {
      const c = labelOf("muscle", a.primaryMuscle).localeCompare(labelOf("muscle", b.primaryMuscle), locale);
      return c || byName(a, b);
    }
    if (filters.sort === "equipment") {
      const c = labelOf("equipment", a.equipment).localeCompare(labelOf("equipment", b.equipment), locale);
      return c || byName(a, b);
    }
    return byName(a, b);
  });
}

/** Distinct catalog values for a filter row, most common first. */
export function distinctValues(
  entries: readonly ExerciseCatalogEntry[],
  pick: (e: ExerciseCatalogEntry) => string,
): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(pick(e), (counts.get(pick(e)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
}

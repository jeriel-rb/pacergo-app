import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORIES,
  type EquipmentCategory,
  type OnboardingEquipment,
} from "@pacergo/shared";

export type EquipmentSort = "category" | "name";
export type EquipmentShow = "all" | "selected" | "unselected";

export interface EquipmentSection {
  /** `null` for the flat A–Z list (no section heading). */
  category: EquipmentCategory | null;
  items: OnboardingEquipment[];
}

/** Applies the picker's search / show-filter / sort to the equipment catalog.
 *  Sections with no matching items are dropped. `nameOf` returns the item's
 *  localized name, used for both matching and A–Z ordering. */
export function buildEquipmentSections({
  query,
  show,
  sort,
  selected,
  nameOf,
  locale,
}: {
  query: string;
  show: EquipmentShow;
  sort: EquipmentSort;
  selected: readonly OnboardingEquipment[];
  nameOf: (id: OnboardingEquipment) => string;
  locale: string;
}): EquipmentSection[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  const chosen = new Set(selected);

  const visible = EQUIPMENT_CATALOG.filter(({ id }) => {
    if (show === "selected" && !chosen.has(id)) return false;
    if (show === "unselected" && chosen.has(id)) return false;
    return !needle || nameOf(id).toLocaleLowerCase(locale).includes(needle);
  });

  if (sort === "name") {
    const items = visible
      .map((e) => e.id)
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));
    return items.length ? [{ category: null, items }] : [];
  }

  return EQUIPMENT_CATEGORIES.map((category) => ({
    category,
    items: visible.filter((e) => e.category === category).map((e) => e.id),
  })).filter((section) => section.items.length > 0);
}

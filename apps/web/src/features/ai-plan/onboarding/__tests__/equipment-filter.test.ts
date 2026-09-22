import { describe, expect, it } from "vitest";
import { EQUIPMENT_CATALOG, EQUIPMENT_PRESETS, type OnboardingEquipment } from "@pacergo/shared";
import { buildEquipmentSections } from "../equipment-filter";

// Readable stand-in names: "kettlebell" → "Kettlebell", "ez_bar" → "Ez Bar".
const nameOf = (id: OnboardingEquipment) =>
  id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const base = {
  query: "",
  show: "all" as const,
  sort: "category" as const,
  selected: EQUIPMENT_PRESETS.garage_gym,
  nameOf,
  locale: "en",
};

const ids = (sections: ReturnType<typeof buildEquipmentSections>) =>
  sections.flatMap((s) => s.items);

describe("buildEquipmentSections", () => {
  it("groups the whole catalog by category, in catalog order", () => {
    const sections = buildEquipmentSections(base);
    expect(sections.map((s) => s.category)).toEqual([
      "free_weights",
      "bars_and_benches",
      "machines",
      "accessories",
      "household",
    ]);
    expect(ids(sections)).toHaveLength(EQUIPMENT_CATALOG.length);
    expect(sections[0].items[0]).toBe("dumbbells");
  });

  it("searches by name (case-insensitive) and drops empty sections", () => {
    const sections = buildEquipmentSections({ ...base, query: "  PRESS " });
    expect(ids(sections).sort()).toEqual([
      "chest_press_machine",
      "leg_press",
      "shoulder_press_machine",
    ]);
    expect(sections.map((s) => s.category)).toEqual(["machines"]);
  });

  it("returns nothing when no name matches", () => {
    expect(buildEquipmentSections({ ...base, query: "zzz" })).toEqual([]);
  });

  it("filters to selected / not selected", () => {
    const selected = ids(buildEquipmentSections({ ...base, show: "selected" }));
    const rest = ids(buildEquipmentSections({ ...base, show: "unselected" }));
    expect(selected.sort()).toEqual([...EQUIPMENT_PRESETS.garage_gym].sort());
    expect(selected.length + rest.length).toBe(EQUIPMENT_CATALOG.length);
    expect(rest).not.toContain("dumbbells");
  });

  it("sorts A–Z as a single flat list without a heading", () => {
    const sections = buildEquipmentSections({ ...base, sort: "name" });
    expect(sections).toHaveLength(1);
    expect(sections[0].category).toBeNull();
    const names = sections[0].items.map(nameOf);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("combines search, show and sort", () => {
    const sections = buildEquipmentSections({
      ...base,
      query: "bar",
      show: "selected",
      sort: "name",
    });
    expect(ids(sections).every((id) => nameOf(id).toLowerCase().includes("bar"))).toBe(true);
    expect(ids(sections)).toEqual(expect.arrayContaining(["barbell", "ez_bar", "pull_up_bar"]));
  });
});

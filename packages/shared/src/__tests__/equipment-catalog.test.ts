import { describe, expect, it } from "vitest";
import {
  CARDIO_CATALOG,
  CARDIO_CATEGORIES,
  CARDIO_PRESETS,
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_PRESETS,
  GYM_EQUIPMENT_DEFAULT,
  ONBOARDING_CARDIO_TYPES,
  ONBOARDING_EQUIPMENT,
  ONBOARDING_GYM_TYPES,
  isCardioAvailable,
  upgradeLegacyEquipment,
  withGymType,
} from "../index";

describe("equipment catalog", () => {
  it("lists every equipment item exactly once, in a known category", () => {
    const ids = EQUIPMENT_CATALOG.map((e) => e.id);
    expect([...ids].sort()).toEqual([...ONBOARDING_EQUIPMENT].sort());
    for (const e of EQUIPMENT_CATALOG) expect(EQUIPMENT_CATEGORIES).toContain(e.category);
  });

  it("only uses catalog items in presets", () => {
    for (const gym of ONBOARDING_GYM_TYPES) {
      for (const id of EQUIPMENT_PRESETS[gym]) expect(ONBOARDING_EQUIPMENT).toContain(id);
    }
  });

  it("scales presets from bodyweight up to large gym", () => {
    expect(EQUIPMENT_PRESETS.large_gym).toHaveLength(ONBOARDING_EQUIPMENT.length);
    expect(EQUIPMENT_PRESETS.small_gym.length).toBeLessThan(EQUIPMENT_PRESETS.large_gym.length);
    expect(EQUIPMENT_PRESETS.garage_gym).toContain("squat_rack");
    const machines = EQUIPMENT_CATALOG.filter((e) => e.category === "machines").map((e) => e.id);
    for (const id of machines) expect(EQUIPMENT_PRESETS.small_gym, id).toContain(id);
    expect(EQUIPMENT_PRESETS.bodyweight_only.length).toBeLessThan(EQUIPMENT_PRESETS.garage_gym.length);
  });

  it("keeps everyday household items available in every gym type", () => {
    for (const gym of ONBOARDING_GYM_TYPES) {
      for (const id of ["chair", "towel", "doorway", "step_box"] as const) {
        expect(EQUIPMENT_PRESETS[gym], `${gym}:${id}`).toContain(id);
      }
    }
    // …and Bodyweight Only has nothing but those.
    const household = EQUIPMENT_CATALOG.filter((e) => e.category === "household").map((e) => e.id);
    expect([...EQUIPMENT_PRESETS.bodyweight_only].sort()).toEqual([...household].sort());
  });

  it("withGymType sets the gym type and replaces the selection with its kit", () => {
    const next = withGymType(GYM_EQUIPMENT_DEFAULT, "garage_gym");
    expect(next.gymType).toBe("garage_gym");
    expect(next.equipment).toEqual([...EQUIPMENT_PRESETS.garage_gym]);
    expect(next.equipment).not.toBe(EQUIPMENT_PRESETS.garage_gym);
    expect(GYM_EQUIPMENT_DEFAULT.equipment).toHaveLength(ONBOARDING_EQUIPMENT.length);
  });
});

describe("cardio catalog", () => {
  it("lists every cardio type exactly once, in a known category", () => {
    const ids = CARDIO_CATALOG.map((c) => c.id);
    expect([...ids].sort()).toEqual([...ONBOARDING_CARDIO_TYPES].sort());
    for (const c of CARDIO_CATALOG) expect(CARDIO_CATEGORIES).toContain(c.category);
  });

  it("only uses gym-equipment cardio in the gym presets", () => {
    const gymIds = CARDIO_CATALOG.filter((c) => c.category === "gym_equipment").map((c) => c.id);
    for (const gym of ONBOARDING_GYM_TYPES) {
      for (const id of CARDIO_PRESETS[gym]) expect(gymIds, `${gym}:${id}`).toContain(id);
    }
  });

  it("makes outdoor cardio available everywhere and gym cardio only where it fits", () => {
    for (const gym of [...ONBOARDING_GYM_TYPES, null] as const) {
      expect(isCardioAvailable(gym, "cycling")).toBe(true);
      expect(isCardioAvailable(gym, "jump_rope")).toBe(true);
    }
    expect(isCardioAvailable("large_gym", "ski_erg")).toBe(true);
    expect(isCardioAvailable("small_gym", "ski_erg")).toBe(false);
    expect(isCardioAvailable("garage_gym", "battle_ropes")).toBe(true);
    expect(isCardioAvailable("bodyweight_only", "treadmill")).toBe(false);
    expect(isCardioAvailable(null, "treadmill")).toBe(false);
  });
});

describe("upgradeLegacyEquipment", () => {
  it("turns the old five-item selection into the gym type's usual kit", () => {
    const old = { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym" as const, equipment: ["dumbbells", "barbell", "plates", "bench", "pull_up_bar"] as never };
    const next = upgradeLegacyEquipment(old);
    expect(next.equipment).toEqual([...EQUIPMENT_PRESETS.large_gym]);
    expect(next.equipment.length).toBeGreaterThan(5);
  });

  it("leaves a real selection, an empty one, or an unknown gym type alone", () => {
    const real = { ...GYM_EQUIPMENT_DEFAULT, gymType: "large_gym" as const, equipment: ["dumbbells", "cable_machine"] as never };
    expect(upgradeLegacyEquipment(real)).toBe(real);
    const empty = { ...GYM_EQUIPMENT_DEFAULT, gymType: "garage_gym" as const, equipment: [] };
    expect(upgradeLegacyEquipment(empty)).toBe(empty);
    const noGym = { ...GYM_EQUIPMENT_DEFAULT, gymType: null, equipment: ["barbell"] as never };
    expect(upgradeLegacyEquipment(noGym)).toBe(noGym);
  });
});

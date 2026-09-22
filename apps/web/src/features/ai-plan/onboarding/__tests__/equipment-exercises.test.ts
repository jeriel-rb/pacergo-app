import { describe, expect, it } from "vitest";
import {
  CARDIO_CATALOG,
  EQUIPMENT_CATALOG,
  ONBOARDING_GYM_TYPES,
  isCardioAvailable,
} from "@pacergo/shared";
import { EXERCISE_CATALOG } from "@/shared/assets/exercise-catalog";
import {
  NO_EQUIPMENT_EXERCISES,
  availableExercises,
  exerciseCountForGymType,
  exercisesForCardio,
  exercisesForEquipment,
  providersOf,
} from "../equipment-exercises";

describe("exercise → equipment mapping", () => {
  it("maps every one of the 302 exercises without throwing", () => {
    for (const e of EXERCISE_CATALOG) expect(() => providersOf(e), e.slug).not.toThrow();
  });

  it("puts every exercise somewhere: an equipment item, a cardio type, or 'no equipment'", () => {
    const seen = new Set<string>(NO_EQUIPMENT_EXERCISES.map((e) => e.slug));
    for (const { id } of EQUIPMENT_CATALOG) for (const e of exercisesForEquipment(id)) seen.add(e.slug);
    for (const { id } of CARDIO_CATALOG) for (const e of exercisesForCardio(id)) seen.add(e.slug);
    expect(seen.size).toBe(EXERCISE_CATALOG.length);
  });

  it("gives every equipment item and cardio type at least one exercise", () => {
    for (const { id } of EQUIPMENT_CATALOG) expect(exercisesForEquipment(id).length, id).toBeGreaterThan(0);
    for (const { id } of CARDIO_CATALOG) expect(exercisesForCardio(id).length, id).toBeGreaterThan(0);
  });

  it("maps the spin-bike drawing to both stationary and outdoor cycling", () => {
    expect(exercisesForCardio("cycling_stationary").map((e) => e.slug)).toContain("cycling");
    expect(exercisesForCardio("cycling").map((e) => e.slug)).toContain("cycling");
  });
});

describe("gym type availability", () => {
  const counts = Object.fromEntries(ONBOARDING_GYM_TYPES.map((g) => [g, exerciseCountForGymType(g)]));

  it("makes every illustrated exercise available in a Large Gym", () => {
    expect(counts.large_gym).toBe(EXERCISE_CATALOG.length);
  });

  it("scales Large > Small / Garage > Bodyweight Only", () => {
    expect(counts.small_gym).toBeLessThan(counts.large_gym);
    expect(counts.garage_gym).toBeLessThan(counts.large_gym);
    expect(counts.bodyweight_only).toBeLessThan(counts.small_gym);
    expect(counts.bodyweight_only).toBeLessThan(counts.garage_gym);
  });

  it("always includes the no-equipment exercises", () => {
    const slugs = new Set(availableExercises([], "bodyweight_only").map((e) => e.slug));
    for (const e of NO_EQUIPMENT_EXERCISES) expect(slugs.has(e.slug)).toBe(true);
    expect(NO_EQUIPMENT_EXERCISES.length).toBeGreaterThan(80);
  });

  it("unlocks exercises as equipment is ticked", () => {
    const none = availableExercises([], "bodyweight_only").length;
    const withBarbell = availableExercises(["barbell"], "bodyweight_only").length;
    expect(withBarbell - none).toBe(exercisesForEquipment("barbell").length);
  });

  it("only counts gym cardio the gym type actually has", () => {
    const skierg = (gym: (typeof ONBOARDING_GYM_TYPES)[number]) =>
      availableExercises([], gym).some((e) => e.slug === "skierg");
    expect(skierg("large_gym")).toBe(isCardioAvailable("large_gym", "ski_erg"));
    expect(skierg("small_gym")).toBe(false);
    expect(availableExercises([], "bodyweight_only").some((e) => e.slug === "hiking")).toBe(true);
  });
});

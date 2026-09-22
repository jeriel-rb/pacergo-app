import {
  EQUIPMENT_PRESETS,
  isCardioAvailable,
  type OnboardingCardioType,
  type OnboardingEquipment,
  type OnboardingGymType,
} from "@pacergo/shared";
import { EXERCISE_CATALOG, type ExerciseCatalogEntry } from "@/shared/assets/exercise-catalog";

/**
 * Which onboarding equipment / cardio type each of the 302 illustrated
 * exercises needs. This is what lets the Equipment and Cardio pickers show
 * "N exercises" per item, and lets every gym type (Large / Small / Garage /
 * Bodyweight) work out which exercises it can do.
 *
 * An exercise needs none of the listed items ("no equipment needed") unless a
 * provider is found; if it has providers, ANY one of them is enough (e.g. the
 * spin-bike drawing counts for both stationary and outdoor cycling).
 */
export interface ExerciseProviders {
  equipment: OnboardingEquipment[];
  cardio: OnboardingCardioType[];
}

/** Catalog `equipment` values that map straight to one item. */
const BY_CATALOG_EQUIPMENT: Record<string, OnboardingEquipment | null> = {
  Barbell: "barbell",
  Dumbbell: "dumbbells",
  Plate: "plates",
  Kettlebell: "kettlebell",
  "Pull-up Bar": "pull_up_bar",
  Bench: "bench",
  "Resistance Band": "resistance_bands",
  "Stability Ball": "stability_ball",
  Cable: "cable_machine",
  Chair: "chair",
  Towel: "towel",
  Doorway: "doorway",
  Box: "step_box",
  Wall: null,
  Bodyweight: null,
};

/** Per-exercise overrides where the catalog's coarse `equipment` value isn't
 *  specific enough (every "Machine" and every "Cardio" exercise is here). */
const EQUIPMENT_OVERRIDES: Record<string, OnboardingEquipment> = {
  // Barbell family
  "trap-bar-deadlift": "trap_bar",
  "landmine-press": "landmine",
  "landmine-squat": "landmine",
  "landmine-romanian-deadlift": "landmine",
  "ez-bar-curl": "ez_bar",
  // Machines
  "machine-chest-press": "chest_press_machine",
  "pec-deck": "pec_deck",
  "reverse-pec-deck": "pec_deck",
  "t-bar-row": "row_machine",
  "chest-supported-row": "row_machine",
  "machine-row": "row_machine",
  "assisted-pull-up": "assisted_machine",
  "assisted-dip": "assisted_machine",
  "assisted-chin-up": "assisted_machine",
  "hack-squat": "hack_squat_machine",
  "belt-squat": "hack_squat_machine",
  "leg-press": "leg_press",
  "leg-press-calf-raise": "leg_press",
  "leg-extension": "leg_extension_machine",
  "leg-curl": "leg_curl_machine",
  "seated-leg-curl": "leg_curl_machine",
  "lying-leg-curl": "leg_curl_machine",
  "standing-calf-raise": "calf_machine",
  "seated-calf-raise": "calf_machine",
  "donkey-calf-raise": "calf_machine",
  "preacher-curl": "preacher_bench",
  "smith-machine-bench-press": "smith_machine",
  "smith-machine-squat": "smith_machine",
  "smith-machine-hip-thrust": "smith_machine",
  "smith-machine-romanian-deadlift": "smith_machine",
  "smith-machine-bulgarian-split-squat": "smith_machine",
  "smith-machine-reverse-lunge": "smith_machine",
  "smith-machine-split-squat": "smith_machine",
  "machine-shoulder-press": "shoulder_press_machine",
  "machine-lateral-raise": "shoulder_press_machine",
  "hip-abduction-machine": "hip_machine",
  "hip-adduction-machine": "hip_machine",
  "machine-glute-kickback": "hip_machine",
  "reverse-hyperextension": "back_extension_bench",
  "captains-chair-knee-raise": "dip_station",
  // Cable-station pulldowns
  "lat-pulldown": "lat_pulldown",
  "close-grip-lat-pulldown": "lat_pulldown",
  "straight-arm-pulldown": "lat_pulldown",
  "wide-grip-lat-pulldown": "lat_pulldown",
  // "Bodyweight" moves that really need a bar, station or bench
  "pull-up": "pull_up_bar",
  "weighted-pull-up": "pull_up_bar",
  "chin-up": "pull_up_bar",
  "weighted-chin-up": "pull_up_bar",
  "neutral-grip-pull-up": "pull_up_bar",
  "hanging-leg-raise": "pull_up_bar",
  "inverted-row": "squat_rack",
  dip: "dip_station",
  "chest-dip": "dip_station",
  "weighted-dip": "dip_station",
  "ab-wheel": "ab_wheel",
  "back-extension": "back_extension_bench",
  "glute-focused-back-extension": "back_extension_bench",
  "bench-dip": "bench",
  "weighted-push-up": "plates",
};

const CARDIO_PROVIDERS: Record<string, OnboardingCardioType[]> = {
  running: ["treadmill"],
  walking: ["treadmill"],
  "treadmill-incline-walk": ["treadmill"],
  cycling: ["cycling_stationary", "cycling"],
  rowing: ["rowing"],
  "stair-climber": ["stair_climber"],
  elliptical: ["elliptical"],
  swimming: ["swimming"],
  "jump-rope": ["jump_rope"],
  "assault-bike": ["air_bike"],
  skierg: ["ski_erg"],
  hiking: ["hiking"],
  "battle-ropes": ["battle_ropes"],
};

/** Everything an exercise needs. Throws for a "Machine"/"Cardio" exercise with
 *  no override, so a catalog update can't silently drop exercises (the tests
 *  run this over the whole catalog). */
export function providersOf(entry: ExerciseCatalogEntry): ExerciseProviders {
  const cardio = CARDIO_PROVIDERS[entry.slug];
  if (cardio) return { equipment: [], cardio };
  if (entry.equipment === "Cardio") throw new Error(`No cardio mapping for ${entry.slug}`);

  const override = EQUIPMENT_OVERRIDES[entry.slug];
  if (override) return { equipment: [override], cardio: [] };
  if (entry.equipment === "Machine") throw new Error(`No machine mapping for ${entry.slug}`);

  const mapped = BY_CATALOG_EQUIPMENT[entry.equipment];
  if (mapped === undefined) throw new Error(`Unknown equipment "${entry.equipment}" for ${entry.slug}`);
  return { equipment: mapped ? [mapped] : [], cardio: [] };
}

const PROVIDERS = new Map(EXERCISE_CATALOG.map((e) => [e.slug, providersOf(e)]));

const byName = (a: ExerciseCatalogEntry, b: ExerciseCatalogEntry) => a.name.localeCompare(b.name);

function group<K extends string>(pick: (p: ExerciseProviders) => K[]): Map<K, ExerciseCatalogEntry[]> {
  const out = new Map<K, ExerciseCatalogEntry[]>();
  for (const e of EXERCISE_CATALOG) {
    for (const key of pick(PROVIDERS.get(e.slug)!)) out.set(key, [...(out.get(key) ?? []), e]);
  }
  for (const list of out.values()) list.sort(byName);
  return out;
}

const BY_EQUIPMENT = group((p) => p.equipment);
const BY_CARDIO = group((p) => p.cardio);

/** Exercises an equipment item unlocks (English-name order; the UI re-sorts). */
export function exercisesForEquipment(id: OnboardingEquipment): ExerciseCatalogEntry[] {
  return BY_EQUIPMENT.get(id) ?? [];
}

/** Exercises a cardio type covers. */
export function exercisesForCardio(id: OnboardingCardioType): ExerciseCatalogEntry[] {
  return BY_CARDIO.get(id) ?? [];
}

/** Exercises that need no equipment at all, available in every gym type. */
export const NO_EQUIPMENT_EXERCISES: ExerciseCatalogEntry[] = EXERCISE_CATALOG.filter((e) => {
  const p = PROVIDERS.get(e.slug)!;
  return p.equipment.length === 0 && p.cardio.length === 0;
}).sort(byName);

/** Exercises available with a given equipment selection: everything that
 *  needs no equipment, anything one of the selected items unlocks, and the
 *  cardio that is realistic for `gymType` (outdoor cardio always counts). */
export function availableExercises(
  equipment: readonly OnboardingEquipment[],
  gymType: OnboardingGymType | null,
): ExerciseCatalogEntry[] {
  const have = new Set(equipment);
  return EXERCISE_CATALOG.filter((e) => {
    const p = PROVIDERS.get(e.slug)!;
    if (p.equipment.length === 0 && p.cardio.length === 0) return true;
    return (
      p.equipment.some((id) => have.has(id)) ||
      p.cardio.some((id) => isCardioAvailable(gymType, id))
    );
  });
}

/** How many of the 302 exercises each gym type can do with its default kit. */
export function exerciseCountForGymType(gymType: OnboardingGymType): number {
  return availableExercises(EQUIPMENT_PRESETS[gymType], gymType).length;
}

import {
  ONBOARDING_EQUIPMENT,
  type GymEquipmentAnswers,
  type OnboardingCardioType,
  type OnboardingEquipment,
  type OnboardingGymType,
} from "./onboarding-types";

/** How the equipment picker groups items (section order = array order). */
export type EquipmentCategory =
  | "free_weights"
  | "bars_and_benches"
  | "machines"
  | "accessories"
  | "household";

export const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  "free_weights",
  "bars_and_benches",
  "machines",
  "accessories",
  "household",
] as const;

/** Category of each item, listed in the order it's shown inside its section
 *  (most common first). */
export const EQUIPMENT_CATALOG: readonly {
  id: OnboardingEquipment;
  category: EquipmentCategory;
}[] = [
  { id: "dumbbells", category: "free_weights" },
  { id: "barbell", category: "free_weights" },
  { id: "plates", category: "free_weights" },
  { id: "kettlebell", category: "free_weights" },
  { id: "ez_bar", category: "free_weights" },
  { id: "trap_bar", category: "free_weights" },
  { id: "landmine", category: "free_weights" },
  { id: "bench", category: "bars_and_benches" },
  { id: "squat_rack", category: "bars_and_benches" },
  { id: "pull_up_bar", category: "bars_and_benches" },
  { id: "dip_station", category: "bars_and_benches" },
  { id: "back_extension_bench", category: "bars_and_benches" },
  { id: "preacher_bench", category: "bars_and_benches" },
  { id: "cable_machine", category: "machines" },
  { id: "lat_pulldown", category: "machines" },
  { id: "smith_machine", category: "machines" },
  { id: "chest_press_machine", category: "machines" },
  { id: "pec_deck", category: "machines" },
  { id: "shoulder_press_machine", category: "machines" },
  { id: "lateral_raise_machine", category: "machines" },
  { id: "row_machine", category: "machines" },
  { id: "chest_supported_row_machine", category: "machines" },
  { id: "leg_press", category: "machines" },
  { id: "leg_extension_machine", category: "machines" },
  { id: "leg_curl_machine", category: "machines" },
  { id: "lying_leg_curl_machine", category: "machines" },
  { id: "hack_squat_machine", category: "machines" },
  { id: "calf_machine", category: "machines" },
  { id: "hip_machine", category: "machines" },
  { id: "assisted_machine", category: "machines" },
  { id: "resistance_bands", category: "accessories" },
  { id: "stability_ball", category: "accessories" },
  { id: "ab_wheel", category: "accessories" },
  { id: "chair", category: "household" },
  { id: "towel", category: "household" },
  { id: "doorway", category: "household" },
  { id: "step_box", category: "household" },
] as const;

/** Everyday items every gym type is assumed to have access to — even
 *  "Bodyweight Only" — so exercises that just need a chair, towel, doorway or
 *  sturdy box stay available everywhere. */
const HOUSEHOLD: readonly OnboardingEquipment[] = ["chair", "towel", "doorway", "step_box"];

/** The typical kit for each gym type — what tapping that gym chip selects.
 *  Users then add/remove individual items. */
export const EQUIPMENT_PRESETS: Record<OnboardingGymType, readonly OnboardingEquipment[]> = {
  large_gym: ONBOARDING_EQUIPMENT,
  small_gym: [
    "dumbbells",
    "barbell",
    "plates",
    "kettlebell",
    "bench",
    "squat_rack",
    "pull_up_bar",
    "dip_station",
    "cable_machine",
    "lat_pulldown",
    "smith_machine",
    "leg_press",
    "resistance_bands",
    ...HOUSEHOLD,
  ],
  garage_gym: [
    "dumbbells",
    "barbell",
    "plates",
    "ez_bar",
    "kettlebell",
    "landmine",
    "bench",
    "squat_rack",
    "pull_up_bar",
    "dip_station",
    "resistance_bands",
    "ab_wheel",
    ...HOUSEHOLD,
  ],
  bodyweight_only: HOUSEHOLD,
};

/** Picks a gym type and resets the equipment selection to that gym's kit. */
export function withGymType(
  answers: GymEquipmentAnswers,
  gymType: OnboardingGymType,
): GymEquipmentAnswers {
  return { ...answers, gymType, equipment: [...EQUIPMENT_PRESETS[gymType]] };
}

/** Cardio options are grouped the same way the equipment picker groups gear. */
export type CardioCategory = "gym_equipment" | "outdoor_and_bodyweight";

export const CARDIO_CATEGORIES: readonly CardioCategory[] = [
  "gym_equipment",
  "outdoor_and_bodyweight",
] as const;

export const CARDIO_CATALOG: readonly {
  id: OnboardingCardioType;
  category: CardioCategory;
}[] = [
  { id: "treadmill", category: "gym_equipment" },
  { id: "elliptical", category: "gym_equipment" },
  { id: "stair_climber", category: "gym_equipment" },
  { id: "cycling_stationary", category: "gym_equipment" },
  { id: "rowing", category: "gym_equipment" },
  { id: "air_bike", category: "gym_equipment" },
  { id: "ski_erg", category: "gym_equipment" },
  { id: "battle_ropes", category: "gym_equipment" },
  { id: "cycling", category: "outdoor_and_bodyweight" },
  { id: "hiking", category: "outdoor_and_bodyweight" },
  { id: "swimming", category: "outdoor_and_bodyweight" },
  { id: "jump_rope", category: "outdoor_and_bodyweight" },
] as const;

/** Gym cardio equipment each gym type typically has. Outdoor & bodyweight
 *  cardio (cycling, hiking, swimming, jump rope) isn't tied to a gym, so it's
 *  available for every gym type — see `isCardioAvailable`. */
export const CARDIO_PRESETS: Record<OnboardingGymType, readonly OnboardingCardioType[]> = {
  large_gym: [
    "treadmill",
    "elliptical",
    "stair_climber",
    "cycling_stationary",
    "rowing",
    "air_bike",
    "ski_erg",
    "battle_ropes",
  ],
  small_gym: ["treadmill", "elliptical", "cycling_stationary", "rowing"],
  garage_gym: ["rowing", "air_bike", "battle_ropes"],
  bodyweight_only: [],
};

const GYM_CARDIO_IDS = new Set<OnboardingCardioType>(
  CARDIO_CATALOG.filter((c) => c.category === "gym_equipment").map((c) => c.id),
);

/** Whether a cardio type is realistic for a gym type. */
export function isCardioAvailable(
  gymType: OnboardingGymType | null,
  cardio: OnboardingCardioType,
): boolean {
  if (!GYM_CARDIO_IDS.has(cardio)) return true;
  return gymType !== null && CARDIO_PRESETS[gymType].includes(cardio);
}

/** The five equipment ids the picker had before it grew to 34 items. Plans saved
 *  then stored just these (all ticked = "a full gym"). */
const LEGACY_EQUIPMENT_IDS = new Set<string>(["dumbbells", "barbell", "plates", "bench", "pull_up_bar"]);

/** Plans saved with the old five-item picker carry only those ids, which would
 *  now read as "just free weights and a bar". Treat that selection as the gym
 *  type's usual kit instead. Selections saved before a machine was split out
 *  of a broader entry gain the new machine (see SPLIT_MACHINES). */
export function upgradeLegacyEquipment(answers: GymEquipmentAnswers): GymEquipmentAnswers {
  const legacy =
    answers.equipment.length > 0 && answers.equipment.every((id) => LEGACY_EQUIPMENT_IDS.has(id));
  if (legacy && answers.gymType !== null) {
    return { ...answers, equipment: [...EQUIPMENT_PRESETS[answers.gymType]] };
  }
  return withSplitMachines(answers);
}

/** Machines that used to be covered by a broader entry (the lateral raise
 *  machine counted as the shoulder press machine, etc.). A selection saved
 *  before the split, which has none of the new ids, keeps access to what its
 *  parent entry used to unlock. */
const SPLIT_MACHINES: readonly [parent: OnboardingEquipment, child: OnboardingEquipment][] = [
  ["shoulder_press_machine", "lateral_raise_machine"],
  ["row_machine", "chest_supported_row_machine"],
  ["leg_curl_machine", "lying_leg_curl_machine"],
];

function withSplitMachines(answers: GymEquipmentAnswers): GymEquipmentAnswers {
  const have = new Set(answers.equipment);
  if (SPLIT_MACHINES.some(([, child]) => have.has(child))) return answers;
  const added = SPLIT_MACHINES.filter(([parent]) => have.has(parent)).map(([, child]) => child);
  return added.length ? { ...answers, equipment: [...answers.equipment, ...added] } : answers;
}

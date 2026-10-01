import type { OnboardingCardioType, OnboardingEquipment } from "@pacergo/shared";

/** Onboarding equipment/cardio artwork: each option shows the first frame of the
 *  Workout Guide illustration (art slug) that clearly features that equipment
 *  (CC BY-SA 4.0 — attribution lives on /credits, linked from Terms and Privacy). */

export const EQUIPMENT_ART: Record<OnboardingEquipment, string> = {
  dumbbells: "standing-dumbbell-press",
  barbell: "overhead-press",
  plates: "plate-front-raise",
  kettlebell: "kettlebell-swing",
  ez_bar: "ez-bar-curl",
  trap_bar: "trap-bar-deadlift",
  landmine: "landmine-press",
  bench: "bench-press",
  squat_rack: "squat",
  pull_up_bar: "dead-hang",
  dip_station: "captains-chair-knee-raise",
  back_extension_bench: "reverse-hyperextension",
  preacher_bench: "preacher-curl",
  cable_machine: "cable-fly",
  lat_pulldown: "lat-pulldown",
  smith_machine: "smith-machine-squat",
  chest_press_machine: "machine-chest-press",
  pec_deck: "pec-deck",
  shoulder_press_machine: "machine-shoulder-press",
  lateral_raise_machine: "machine-lateral-raise",
  row_machine: "machine-row",
  chest_supported_row_machine: "chest-supported-row",
  leg_press: "leg-press",
  leg_extension_machine: "leg-extension",
  leg_curl_machine: "leg-curl",
  lying_leg_curl_machine: "lying-leg-curl",
  hack_squat_machine: "hack-squat",
  calf_machine: "standing-calf-raise",
  hip_machine: "hip-abduction-machine",
  assisted_machine: "assisted-pull-up",
  resistance_bands: "banded-row",
  stability_ball: "stability-ball-hamstring-curl",
  ab_wheel: "ab-wheel",
  chair: "chair-dip",
  towel: "towel-row",
  doorway: "doorway-row",
  step_box: "single-leg-box-squat",
};

/** There's no separate outdoor-bike drawing, so both cycling options share
 *  the exercise-bike illustration. */
export const CARDIO_ART: Record<OnboardingCardioType, string> = {
  treadmill: "running",
  elliptical: "elliptical",
  stair_climber: "stair-climber",
  cycling_stationary: "cycling",
  rowing: "rowing",
  air_bike: "assault-bike",
  ski_erg: "skierg",
  battle_ropes: "battle-ropes",
  cycling: "cycling",
  hiking: "hiking",
  swimming: "swimming",
  jump_rope: "jump-rope",
};

export const CARDIO_HERO_ART = "running";

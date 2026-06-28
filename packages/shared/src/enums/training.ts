/** AI training-menu dimensions. The plan *level* reuses `ExperienceLevel`
 *  (beginner/intermediate/advanced) — see ../enums/experience. */

/** What the user is training for. */
export type TrainingGoal =
  | "fat_loss" // 減脂塑形
  | "muscle_gain" // 增肌訓練
  | "endurance" // 耐力提升
  | "flexibility"; // 柔韌伸展

export const TRAINING_GOALS: readonly TrainingGoal[] = [
  "fat_loss",
  "muscle_gain",
  "endurance",
  "flexibility",
] as const;

/** Age band — refines the plan's framing (warm-up, recovery, intensity). */
export type AgeBand =
  | "youth" // 青少年 15-25
  | "adult" // 成人 26-45
  | "senior"; // 熟齡 46+

export const AGE_BANDS: readonly AgeBand[] = ["youth", "adult", "senior"] as const;

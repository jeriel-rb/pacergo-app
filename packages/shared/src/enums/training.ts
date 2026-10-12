/** Personalized workout chips on the mobile plan screen. Web uses the richer
 *  onboarding answers in ../onboarding/onboarding-types.ts. */

/** What the user is training for. */
export type TrainingGoal =
  | "muscle_gain" // 增肌訓練
  | "fat_loss" // 減脂塑形
  | "functional" // 功能性表現（Hyrox / CrossFit 混合式訓練）
  | "general_fitness"; // 綜合體能

export const TRAINING_GOALS: readonly TrainingGoal[] = [
  "muscle_gain",
  "fat_loss",
  "functional",
  "general_fitness",
] as const;

/** How often the user can train. */
export type TrainingFrequency =
  | "every_day" // 每天
  | "every_2_days" // 每 2 天
  | "3x" // 一週 3 次
  | "2x" // 一週 2 次
  | "1x"; // 一週 1 次

export const TRAINING_FREQUENCIES: readonly TrainingFrequency[] = [
  "every_day",
  "every_2_days",
  "3x",
  "2x",
  "1x",
] as const;

/** Where the user trains, and with what equipment — constrains the exercise
 *  pool so the generated menu is actually executable. */
export type TrainingLocation =
  | "gym" // 健身房（全功能器材）
  | "home" // 居家（啞鈴＋彈力帶）
  | "bodyweight" // 純徒手
  | "outdoor"; // 戶外

export const TRAINING_LOCATIONS: readonly TrainingLocation[] = [
  "gym",
  "home",
  "bodyweight",
  "outdoor",
] as const;

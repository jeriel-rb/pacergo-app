/** Personalized Workout Plan Generator (Beta) dimensions — see
 *  ../plan/plan-types.ts (structured plan) and ../plan/plan-composer.ts.
 *  The plan *level* reuses the composer levels (beginner/intermediate/advanced)
 *  — see ../enums/experience.
 *
 *  Exactly 6 onboarding inputs (spec A-1), no others: goal, experience,
 *  training frequency, location & equipment, gender + weight class, diet
 *  mode. No age, no height/weight numbers, no injury flags, no session
 *  duration, no target areas, no free text.
 */

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

/** Body-type / weight class — tunes intensity, impact and calorie guidance.
 *  Interpreted per gender (the same class maps to different guidance for
 *  male vs female plans). */
export type WeightClass =
  | "slim" // 纖細
  | "medium" // 中等
  | "heavy"; // 肥胖

export const WEIGHT_CLASSES: readonly WeightClass[] = [
  "slim",
  "medium",
  "heavy",
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

/** Diet mode — picks the nutrition/supplement logic paired with the menu.
 *  `none` gives generic balanced-diet guidance (the nutrition section is
 *  always shown — there is no separate on/off toggle). */
export type DietMode =
  | "none" // 均衡飲食
  | "muscle_gain" // 增肌飲食
  | "fat_loss" // 減脂飲食
  | "intermittent_fasting"; // 間歇性斷食

export const DIET_MODES: readonly DietMode[] = [
  "none",
  "muscle_gain",
  "fat_loss",
  "intermittent_fasting",
] as const;

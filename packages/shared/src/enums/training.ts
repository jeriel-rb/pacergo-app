/** AI training-menu dimensions. The plan *level* reuses `ExperienceLevel`
 *  (beginner/intermediate/advanced) — see ../enums/experience. */

/** What the user is training for. */
export type TrainingGoal =
  | "fat_loss" // 減脂塑形
  | "muscle_gain" // 增肌訓練
  | "endurance" // 耐力提升
  | "flexibility" // 柔韌伸展
  | "functional"; // 功能性表現（Hyrox / CrossFit 混合式訓練）

export const TRAINING_GOALS: readonly TrainingGoal[] = [
  "fat_loss",
  "muscle_gain",
  "endurance",
  "flexibility",
  "functional",
] as const;

/** Age band — refines the plan's framing (warm-up, recovery, intensity). */
export type AgeBand =
  | "youth" // 青少年 15-25
  | "adult" // 成人 26-45
  | "senior"; // 熟齡 46+

export const AGE_BANDS: readonly AgeBand[] = ["youth", "adult", "senior"] as const;

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

/** How many days per week the user can train. */
export type TrainingFrequency =
  | "low" // 1-2 天
  | "mid" // 3-4 天
  | "high"; // 5 天以上

export const TRAINING_FREQUENCIES: readonly TrainingFrequency[] = [
  "low",
  "mid",
  "high",
] as const;

/** Where the user trains — constrains the exercise pool so the generated
 *  menu is actually executable. */
export type TrainingLocation =
  | "home" // 居家徒手
  | "full_gym" // 全功能健身房
  | "limited_gym"; // 有限器材健身房

export const TRAINING_LOCATIONS: readonly TrainingLocation[] = [
  "home",
  "full_gym",
  "limited_gym",
] as const;

/** Diet mode — picks the nutrition/supplement logic paired with the menu.
 *  `none` omits the nutrition section entirely. */
export type DietMode =
  | "none" // 不需要飲食建議
  | "muscle_gain" // 增肌飲食
  | "fat_loss" // 減脂飲食
  | "intermittent_fasting"; // 間歇性斷食

export const DIET_MODES: readonly DietMode[] = [
  "none",
  "muscle_gain",
  "fat_loss",
  "intermittent_fasting",
] as const;

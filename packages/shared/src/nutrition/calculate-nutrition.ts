import { planExperience } from "../onboarding/onboarding-types";
import { isPlanGender, type FitnessProfile } from "./fitness-profile";
import { DEFAULT_NUTRITION_RULES, type NutritionRules } from "./nutrition-rules";
import { clampTrainingDays, isValidBodyMetric } from "./profile-limits";

/** The slice of the Shared Fitness Profile nutrition depends on. Only these
 *  are stored with a result and compared for staleness, so e.g. an equipment
 *  change doesn't count as a nutrition change. */
export type NutritionInputs = Pick<
  FitnessProfile,
  | "gender"
  | "age"
  | "heightCm"
  | "weightKg"
  | "activityLevel"
  | "goal"
  | "experience"
  | "trainingDaysPerWeek"
>;

const NUTRITION_INPUT_KEYS: readonly (keyof NutritionInputs)[] = [
  "gender",
  "age",
  "heightCm",
  "weightKg",
  "activityLevel",
  "goal",
  "experience",
  "trainingDaysPerWeek",
];

function pickNutritionInputs(profile: NutritionInputs): NutritionInputs {
  const out = {} as Record<keyof NutritionInputs, unknown>;
  for (const k of NUTRITION_INPUT_KEYS) out[k] = profile[k] ?? null;
  return out as NutritionInputs;
}

/** Profile fields the calculation can't run without — exactly the questions
 *  the nutrition flow asks when the Shared Fitness Profile lacks them.
 *  Experience and training days have neutral fallbacks, so they aren't
 *  listed. */
export type NutritionInput = "gender" | "age" | "heightCm" | "weightKg" | "activityLevel" | "goal";

/** One piece of personalized food guidance. Copy lives in the UI's
 *  translations (`plan:nutrition.guidance.<key>`); `params` fills it in. */
export type NutritionGuidanceKey =
  | "proteinPerMeal"
  | "proteinFoods"
  | "goal_lose_weight"
  | "goal_build_muscle"
  | "goal_stay_healthy"
  | "goal_functional"
  | "activity_low"
  | "activity_high"
  | "hydration";

export interface NutritionGuidanceItem {
  key: NutritionGuidanceKey;
  params?: Record<string, number>;
}

/** Estimated daily targets for one fitness profile. Saved to the account as-is
 *  (`user_onboarding.nutrition`), so it carries the inputs and rules version it
 *  was computed from to detect when it's out of date. */
export interface NutritionTargets {
  /** Basal metabolic rate, kcal/day. */
  bmrKcal: number;
  /** Maintenance (estimated total energy expenditure), kcal/day. */
  maintenanceKcal: number;
  /** Goal-adjusted daily calorie recommendation, kcal/day. */
  dailyCalories: number;
  proteinGrams: number;
  proteinGPerKg: number;
  guidance: NutritionGuidanceItem[];
  rulesVersion: number;
  inputs: NutritionInputs;
}

export function missingNutritionInputs(profile: NutritionInputs): NutritionInput[] {
  const missing: NutritionInput[] = [];
  if (!isPlanGender(profile.gender)) missing.push("gender");
  // Out-of-range values count as missing, so the flow asks for them again.
  if (!isValidBodyMetric("age", profile.age)) missing.push("age");
  if (!isValidBodyMetric("heightCm", profile.heightCm)) missing.push("heightCm");
  if (!isValidBodyMetric("weightKg", profile.weightKg)) missing.push("weightKg");
  if (!profile.activityLevel) missing.push("activityLevel");
  if (!profile.goal) missing.push("goal");
  return missing;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/**
 * Estimate daily calories and protein from the Shared Fitness Profile.
 * Pure and deterministic; returns null when a required input is missing or
 * outside the plausible range in `PROFILE_LIMITS` (so a corrupt saved row can
 * never produce negative or absurd targets).
 *
 * Calories: Mifflin-St Jeor BMR × (daily-activity factor + per-session
 * training factor) = maintenance, then × the goal factor, floored at a
 * per-gender minimum. Protein: g/kg of current body weight by goal ×
 * experience, plus a bonus at high training frequency, capped.
 */
export function calculateNutrition(
  profile: NutritionInputs,
  rules: NutritionRules = DEFAULT_NUTRITION_RULES,
): NutritionTargets | null {
  const { gender, age, heightCm, weightKg, activityLevel, goal } = profile;
  if (missingNutritionInputs(profile).length > 0) return null;
  if (!isPlanGender(gender) || !age || !heightCm || !weightKg || !activityLevel || !goal) return null;

  const experience = planExperience(profile.experience) ?? "basic";
  const sessions = clampTrainingDays(profile.trainingDaysPerWeek);

  const bmr =
    rules.bmr.weightCoef * weightKg +
    rules.bmr.heightCoef * heightCm -
    rules.bmr.ageCoef * age +
    rules.bmr.sexOffset[gender];
  const maintenance =
    bmr * (rules.activityFactor[activityLevel] + rules.trainingFactorPerSession * sessions);
  const floor = Math.min(rules.minCalories[gender], maintenance);
  const dailyCalories = Math.max(maintenance * rules.goalCalorieFactor[goal], floor);

  const bonus =
    sessions >= rules.proteinTrainingBonus.minSessionsPerWeek ? rules.proteinTrainingBonus.gPerKg : 0;
  const proteinGPerKg = Math.min(
    rules.proteinGPerKg[goal][experience] + bonus,
    rules.proteinGPerKgMax,
  );

  const proteinGrams = roundTo(proteinGPerKg * weightKg, 5);
  const guidance: NutritionGuidanceItem[] = [
    { key: "proteinPerMeal", params: { grams: roundTo(proteinGrams / rules.mealsPerDay, 5), meals: rules.mealsPerDay } },
    { key: "proteinFoods" },
    { key: `goal_${goal}` },
  ];
  if (activityLevel === "low") guidance.push({ key: "activity_low" });
  if (activityLevel === "high") guidance.push({ key: "activity_high" });
  guidance.push({
    key: "hydration",
    params: { liters: Math.round((weightKg * rules.waterMlPerKg) / 100) / 10 },
  });

  return {
    bmrKcal: Math.round(bmr),
    maintenanceKcal: roundTo(maintenance, 10),
    dailyCalories: roundTo(dailyCalories, 10),
    proteinGrams,
    proteinGPerKg: Math.round(proteinGPerKg * 100) / 100,
    guidance,
    rulesVersion: rules.version,
    inputs: pickNutritionInputs(profile),
  };
}

function sameInputs(a: NutritionInputs, b: NutritionInputs): boolean {
  return NUTRITION_INPUT_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));
}

/** True when `saved` no longer reflects `profile` — a relevant input changed,
 *  or it was computed under an older rules version. */
export function nutritionNeedsRecalc(
  saved: NutritionTargets | null | undefined,
  profile: NutritionInputs,
  rules: NutritionRules = DEFAULT_NUTRITION_RULES,
): boolean {
  if (!saved) return calculateNutrition(profile, rules) !== null;
  return saved.rulesVersion !== rules.version || !sameInputs(saved.inputs, profile);
}

/** Is a saved `user_onboarding.nutrition` blob safe to show? It is client-written
 *  JSON, so check the shape and that every number is finite and plausible; when
 *  it isn't, callers treat it as "not saved" and recompute from the profile. */
export function isValidSavedNutrition(value: unknown): value is NutritionTargets {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const num = (x: unknown, min: number, max: number) =>
    typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  return (
    num(v.bmrKcal, 300, 6000) &&
    num(v.maintenanceKcal, 300, 12000) &&
    num(v.dailyCalories, 300, 12000) &&
    num(v.proteinGrams, 10, 800) &&
    num(v.proteinGPerKg, 0.5, 4) &&
    num(v.rulesVersion, 0, 1_000_000) &&
    Array.isArray(v.guidance) &&
    v.guidance.length <= 20 &&
    typeof v.inputs === "object" &&
    v.inputs !== null
  );
}

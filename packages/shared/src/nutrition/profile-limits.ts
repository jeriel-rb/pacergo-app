import {
  ONBOARDING_DAYS_PER_WEEK,
  planExperience,
  ONBOARDING_DURATION_MAX,
  ONBOARDING_DURATION_MIN,
  REST_TIMER_MAX_SEC,
  REST_TIMER_MIN_SEC,
  type OnboardingAnswers,
  type TrainingPreferencesAnswers,
} from "../onboarding/onboarding-types";

/** Plausible human bounds for the body facts the plans are computed from.
 *  Deliberately wider than what the pickers offer (age 13–90, 120–220 cm,
 *  30–180 kg, and feet/inches up to ~270 cm) so a legitimate save is never
 *  rejected; they only exist to stop nonsense (negative, huge, non-numeric)
 *  reaching the calculators. The database enforces the same bounds in
 *  `save_onboarding_answers` — keep the two in sync. */
export const PROFILE_LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 90, max: 275 },
  weightKg: { min: 25, max: 250 },
  trainingDaysPerWeek: { min: 0, max: 7 },
} as const;

export type BodyMetric = "age" | "heightCm" | "weightKg";

/** True for a finite number inside the metric's bounds. */
export function isValidBodyMetric(metric: BodyMetric, value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const { min, max } = PROFILE_LIMITS[metric];
  return value >= min && value <= max;
}

/** A body metric, or null when it is missing, non-numeric or out of range. */
export function sanitizeBodyMetric(metric: BodyMetric, value: unknown): number | null {
  return isValidBodyMetric(metric, value) ? value : null;
}

/** Whole weekly sessions clamped to 0–7; anything non-numeric counts as none. */
export function clampTrainingDays(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const { min, max } = PROFILE_LIMITS.trainingDaysPerWeek;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Drop out-of-range or non-numeric body facts from a saved About You slice —
 *  the row is client-written JSON, so it is untrusted on the way back in. */
export function sanitizeAboutYou(answers: OnboardingAnswers): OnboardingAnswers {
  const cleaned = { ...answers } as OnboardingAnswers & { useCases?: unknown };
  // Rows saved before this unused field was removed may still carry it.
  delete cleaned.useCases;
  return {
    ...cleaned,
    age: sanitizeBodyMetric("age", answers.age),
    heightCm: sanitizeBodyMetric("heightCm", answers.heightCm),
    weightKg: sanitizeBodyMetric("weightKg", answers.weightKg),
  };
}

const isNumberIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Same idea for the Training Preferences slice: unknown frequency, a session
 *  length or rest range outside the sliders, or a non-array day list would
 *  otherwise crash or skew plan generation. Bad values fall back to "unset"
 *  (or the default rest range). */
export function sanitizeTrainingPreferences(
  prefs: TrainingPreferencesAnswers,
  defaults: Pick<TrainingPreferencesAnswers, "restTimerMinSec" | "restTimerMaxSec">,
): TrainingPreferencesAnswers {
  const validRest =
    isNumberIn(prefs.restTimerMinSec, REST_TIMER_MIN_SEC, REST_TIMER_MAX_SEC) &&
    isNumberIn(prefs.restTimerMaxSec, REST_TIMER_MIN_SEC, REST_TIMER_MAX_SEC) &&
    prefs.restTimerMinSec <= prefs.restTimerMaxSec;
  return {
    ...prefs,
    experience: planExperience(prefs.experience),
    daysPerWeek: ONBOARDING_DAYS_PER_WEEK.includes(prefs.daysPerWeek as never) ? prefs.daysPerWeek : null,
    trainingDays: Array.isArray(prefs.trainingDays) ? prefs.trainingDays.filter((d) => Number.isInteger(d)) : [],
    durationMin: isNumberIn(prefs.durationMin, ONBOARDING_DURATION_MIN, ONBOARDING_DURATION_MAX)
      ? prefs.durationMin
      : null,
    restTimerMinSec: validRest ? prefs.restTimerMinSec : defaults.restTimerMinSec,
    restTimerMaxSec: validRest ? prefs.restTimerMaxSec : defaults.restTimerMaxSec,
  };
}

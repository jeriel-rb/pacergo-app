/** Self-reported gender. On web it lives in the Shared Fitness Profile
 *  (`user_onboarding.about_you.gender`), asked once and read by AI Training and
 *  AI Nutrition; `users.gender` is only a one-way mirror kept for the mobile
 *  app. Product decision: male/female only. `"other"` stays in the type only so
 *  older stored values still parse — it's treated as unanswered everywhere. */
export type Gender = "male" | "female" | "other";

/** Genders the AI training plans are authored for. */
export type PlanGender = "male" | "female";
export const PLAN_GENDERS: readonly PlanGender[] = ["male", "female"] as const;

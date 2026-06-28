/** Self-reported gender. Stored on `users.gender` (free text in DB; this is the
 *  app-level set). The AI training menu only branches on male/female (plans
 *  differ); `other` falls back to a user choice in that UI. */
export type Gender = "male" | "female" | "other";

export const GENDERS: readonly Gender[] = ["male", "female", "other"] as const;

/** Genders the AI training plans are authored for. */
export type PlanGender = "male" | "female";
export const PLAN_GENDERS: readonly PlanGender[] = ["male", "female"] as const;

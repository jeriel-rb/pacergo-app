import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export interface WeeklyProgress {
  target: number;
  done: number;
  /** "plan": target = the active plan's training days, done = its workouts
   *  finished this week. "manual": the user's own weekly target + completed
   *  bookings (no active plan). */
  source: "plan" | "manual";
  /** The active plan, when `source` is "plan". */
  planId: string | null;
}

/** The signed-in user's weekly target and sessions completed this week —
 *  following the same active plan AI Training opens. */
export async function getWeeklyProgress(): Promise<WeeklyProgress> {
  if (!SUPABASE_CONFIGURED) return { target: 5, done: 0, source: "manual", planId: null };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("weekly_progress");
  const r = (data ?? {}) as Partial<WeeklyProgress>;
  return {
    target: r.target ?? 5,
    done: r.done ?? 0,
    source: r.source === "plan" ? "plan" : "manual",
    planId: r.planId ?? null,
  };
}

import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export interface WeeklyProgress {
  target: number;
  done: number;
}

/** The signed-in user's weekly target and sessions completed this week. */
export async function getWeeklyProgress(): Promise<WeeklyProgress> {
  if (!SUPABASE_CONFIGURED) return { target: 5, done: 0 };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("weekly_progress");
  const r = (data ?? {}) as Partial<WeeklyProgress>;
  return { target: r.target ?? 5, done: r.done ?? 0 };
}

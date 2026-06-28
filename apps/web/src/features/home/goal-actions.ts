"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

/** Set the signed-in user's weekly training target (via RPC). No-op in mock. */
export async function setWeeklyTarget(target: number): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_weekly_target", { p_target: target });
  if (error) throw new Error(error.message);
}

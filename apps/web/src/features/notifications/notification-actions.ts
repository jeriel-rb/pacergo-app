"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

/** Mark all the caller's notifications read (via RPC). No-op in mock. */
export async function markNotificationsRead(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const supabase = createSupabaseBrowserClient();
  await supabase.rpc("mark_notifications_read");
}

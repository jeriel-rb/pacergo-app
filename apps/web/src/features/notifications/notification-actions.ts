"use client";

import { NOTIFICATION_PAGE_SIZE } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import type { AppNotification } from "@/lib/notifications";

/** Mark all the caller's notifications read (via RPC). No-op in mock. */
export async function markNotificationsRead(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const supabase = createSupabaseBrowserClient();
  await supabase.rpc("mark_notifications_read");
}

/** The next page of notifications, newest first. */
export async function fetchNotificationPage(offset: number): Promise<AppNotification[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("my_notifications", {
    p_limit: NOTIFICATION_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

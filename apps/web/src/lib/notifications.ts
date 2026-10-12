import { NOTIFICATION_PAGE_SIZE } from "@pacergo/shared";
import { createSupabaseServerClient } from "./supabase/server";
import { SUPABASE_CONFIGURED } from "./supabase/env";

export interface AppNotification {
  id: string;
  type: string;
  payload: {
    booking_id?: string;
    status?: string;
    /** Trainer-request review (`verification_approved` / `verification_rejected`). */
    activity?: string | null;
    label?: string | null;
    notes?: string | null;
  } & Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** One page of the signed-in user's notifications, newest first. */
export async function getMyNotifications(offset = 0): Promise<AppNotification[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_notifications", {
    p_limit: NOTIFICATION_PAGE_SIZE,
    p_offset: offset,
  });
  return (data ?? []) as AppNotification[];
}

/** Unread notification count (for the header bell badge). */
export async function getUnreadNotificationCount(): Promise<number> {
  if (!SUPABASE_CONFIGURED) return 0;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("unread_notification_count");
  return (data ?? 0) as number;
}

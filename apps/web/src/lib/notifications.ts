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

/** The signed-in user's recent notifications. */
export async function getMyNotifications(): Promise<AppNotification[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_notifications");
  return (data ?? []) as AppNotification[];
}

/** Unread notification count (for the header bell badge). */
export async function getUnreadNotificationCount(): Promise<number> {
  if (!SUPABASE_CONFIGURED) return 0;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("unread_notification_count");
  return (data ?? 0) as number;
}

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Service-role client: bypasses RLS, so it must only ever run on the server
 *  (route handlers / server actions). The key is not NEXT_PUBLIC_, so it is
 *  never bundled for the browser; the guard below makes a mistaken client-side
 *  import fail loudly instead of silently running without it. */
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("supabase_admin_client_server_only");
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("supabase_service_role_unavailable");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

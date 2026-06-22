"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY } from "./env";

/** Browser Supabase client for auth + client-side calls. Reads/writes the
 *  session cookies that the server client reads in RSC. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Works for both web (NEXT_PUBLIC_*) and native (EXPO_PUBLIC_*). The
// publishable/anon key is safe for client exposure (RLS gates real access).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * When no Supabase URL is configured, the data layer serves mock fixtures.
 * Setting the env vars flips every query to live Supabase with no UI changes.
 */
export const USE_MOCK = !SUPABASE_URL;

let client: SupabaseClient | null = null;

/**
 * Anonymous Supabase client for public, read-only discovery (the public RPCs).
 * Authenticated/SSR clients (cookies, sessions) are layered in when auth lands.
 */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase env not configured (URL/key missing)");
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

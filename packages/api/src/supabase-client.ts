import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Works for both web (NEXT_PUBLIC_*) and native (EXPO_PUBLIC_*). The
// publishable/anon key is safe for client exposure (RLS gates real access).
const SUPABASE_URL = normalizeSupabaseProjectUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "",
);
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * When Supabase is not fully configured, the data layer serves mock fixtures.
 * Setting the env vars flips every query to live Supabase with no UI changes.
 */
export const USE_MOCK = !SUPABASE_URL || !SUPABASE_KEY;

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

export function normalizeSupabaseProjectUrl(value: string): string {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (
      url.hostname.endsWith(".supabase.co") ||
      /^\/(?:auth|rest|storage)\/v1\/?$/i.test(url.pathname)
    ) {
      return url.origin;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

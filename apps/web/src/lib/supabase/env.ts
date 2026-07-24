export const SUPABASE_URL = normalizeSupabaseProjectUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "",
);
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

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

/**
 * Env-gated data source switch. When `NEXT_PUBLIC_SUPABASE_URL` is absent (the
 * current state), the data layer serves mock fixtures. Setting the env vars
 * flips every query to Supabase with no UI changes.
 */
export const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Lazily constructs a Supabase browser client. Only called on the live path, so
 * the mock build never needs `@supabase/ssr` resolved at runtime.
 */
export async function getSupabaseBrowser() {
  const { createBrowserClient } = await import('@supabase/ssr');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

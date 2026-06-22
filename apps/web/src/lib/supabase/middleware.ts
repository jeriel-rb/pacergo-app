import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_CONFIGURED } from "./env";

/**
 * Refreshes the Supabase auth session on each request, writing the refreshed
 * cookies onto `response`, and returns the authenticated user (or null).
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ user: User | null }> {
  if (!SUPABASE_CONFIGURED) return { user: null };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the token with the auth server and refreshes it,
  // landing new cookies on `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_CONFIGURED } from "./env";

/**
 * Refreshes the Supabase auth session on each request and writes the refreshed
 * cookies onto `response`. Pass the response produced by i18n routing so the
 * locale rewrite and the session cookies are returned together.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!SUPABASE_CONFIGURED) return response;

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

  // Touch the session so expired access tokens get refreshed (and the new
  // cookies land on the response).
  await supabase.auth.getUser();
  return response;
}

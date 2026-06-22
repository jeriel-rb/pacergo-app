import { i18nRouter } from "next-i18n-router";
import type { NextRequest } from "next/server";
import i18nConfig from "@/i18nConfig";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // i18n routing first (may rewrite for the locale); then refresh the Supabase
  // session, writing its cookies onto the same response.
  const response = i18nRouter(request, i18nConfig);
  return updateSession(request, response);
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
};

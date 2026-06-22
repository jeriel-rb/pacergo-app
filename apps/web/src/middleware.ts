import { i18nRouter } from "next-i18n-router";
import { NextResponse, type NextRequest } from "next/server";
import i18nConfig from "@/i18nConfig";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";

// Routes reachable without a session. Everything else requires sign-in.
const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

function isPublic(strippedPath: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  // i18n routing first (locale rewrite); then refresh the session.
  const response = i18nRouter(request, i18nConfig);
  const { user } = await updateSession(request, response);

  const locale = getCurrentLocale(request.nextUrl.pathname);
  const stripped = pathWithoutLeadingLocale(request.nextUrl.pathname);
  const publicPage = isPublic(stripped);

  // Not signed in on a protected page → sign-in.
  if (!user && !publicPage) {
    return redirectTo(request, getLocalizedPath("/sign-in", locale), response);
  }

  // Signed in but on an auth page → home.
  if (user && publicPage) {
    return redirectTo(request, getLocalizedPath("/", locale), response);
  }

  return response;
}

/** Redirect while preserving any auth cookies refreshed onto `from`. */
function redirectTo(request: NextRequest, pathname: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
};

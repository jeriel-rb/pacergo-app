import { NextResponse, type NextRequest } from "next/server";
import i18nConfig, { LOCALE_COOKIE_NAME } from "@/i18nConfig";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";

// Routes reachable without a session. Everything else requires sign-in.
const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/auth/callback",
  "/auth/recovery",
  "/verify",
  "/verify-pending",
  "/forgot-password",
  "/new-password",
  // A10: legal/consent pages (Terms, Privacy, Risk Disclosure, Partner Conduct
  // Rules) must be readable before sign-up, not just after — this is what the
  // sign-up checkbox links to.
  "/legal",
];
const AUTH_ENTRY_PATHS = ["/sign-in", "/sign-up", "/forgot-password"];

function isPublic(strippedPath: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}

function isAuthEntry(strippedPath: string): boolean {
  return AUTH_ENTRY_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  // i18n routing first (locale rewrite); then refresh the session.
  const response = localizedResponse(request);
  const { user } = await updateSession(request, response);

  const locale = getCurrentLocale(request.nextUrl.pathname);
  const stripped = pathWithoutLeadingLocale(request.nextUrl.pathname);
  const publicPage = isPublic(stripped);

  // Not signed in on a protected page → sign-in.
  if (!user && !publicPage) {
    return redirectTo(request, getLocalizedPath("/sign-in", locale), response);
  }

  // Signed in but on sign-in / sign-up → home.
  if (user && isAuthEntry(stripped)) {
    return redirectTo(request, getLocalizedPath("/", locale), response);
  }

  return response;
}

function localizedResponse(request: NextRequest) {
  const requestHeaders = { request: { headers: new Headers(request.headers) } };
  const pathname = request.nextUrl.pathname;
  const pathLocale = i18nConfig.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathLocale) {
    const response = NextResponse.next(requestHeaders);
    setLocale(response, pathLocale);
    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const preferredLocale = i18nConfig.locales.includes(cookieLocale ?? "")
    ? cookieLocale
    : i18nConfig.defaultLocale;

  if (preferredLocale && preferredLocale !== i18nConfig.defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname =
      pathname === "/" ? `/${preferredLocale}` : `/${preferredLocale}${pathname}`;
    const response = NextResponse.redirect(url);
    setLocale(response, preferredLocale);
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname =
    pathname === "/"
      ? `/${i18nConfig.defaultLocale}`
      : `/${i18nConfig.defaultLocale}${pathname}`;
  const response = NextResponse.rewrite(url, requestHeaders);
  setLocale(response, i18nConfig.defaultLocale);
  return response;
}

function setLocale(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
  });
  response.headers.set("x-next-i18n-router-locale", locale);
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

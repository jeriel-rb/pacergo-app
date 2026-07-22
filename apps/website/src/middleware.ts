import { i18nRouter } from "next-i18n-router";
import { NextResponse, type NextRequest } from "next/server";
import i18nConfig from "@/i18nConfig";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const traditionalChinesePath = "/zh-TW";
  const defaultLocalePath = `/${i18nConfig.defaultLocale}`;

  if (pathname === traditionalChinesePath || pathname.startsWith(`${traditionalChinesePath}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(traditionalChinesePath.length) || "/";
    const response = NextResponse.redirect(url);
    response.cookies.set(i18nConfig.localeCookie, i18nConfig.defaultLocale);
    return response;
  }

  if (
    !i18nConfig.prefixDefault &&
    (pathname === defaultLocalePath || pathname.startsWith(`${defaultLocalePath}/`))
  ) {
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });

    response.headers.set("x-next-i18n-router-locale", i18nConfig.defaultLocale);
    return response;
  }

  return i18nRouter(request, i18nConfig);
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
};

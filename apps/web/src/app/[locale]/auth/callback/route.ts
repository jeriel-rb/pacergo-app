import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  callbackFailureLogPayload,
  isSupportedOtpType,
  mapAuthCallbackError,
  normalizeLocale,
  safeHomePath,
  sanitizeInternalRedirect,
  type VerificationErrorCode,
} from "@/lib/auth-callback";

type RouteContext = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(routeLocale);
  const searchParams = request.nextUrl.searchParams;
  const next = sanitizeInternalRedirect(searchParams.get("next"), locale);

  if (searchParams.has("error")) {
    return redirectToResult(request, locale, {
      error: providerErrorFromQuery(searchParams),
      next,
    });
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !tokenHash) {
    return redirectToResult(request, locale, {
      error: "verification_missing_parameters",
      next,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const reason = mapAuthCallbackError(error);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          return redirectToResult(request, locale, { status: "success", next });
        }
        console.warn(callbackFailureLogPayload(reason, error));
        return redirectToResult(request, locale, { error: reason, next });
      }
    } else {
      if (!tokenHash || !isSupportedOtpType(type)) {
        return redirectToResult(request, locale, {
          error: tokenHash
            ? "verification_invalid"
            : "verification_missing_parameters",
          next,
        });
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) {
        const reason = mapAuthCallbackError(error);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          return redirectToResult(request, locale, { status: "success", next });
        }
        console.warn(callbackFailureLogPayload(reason, error));
        return redirectToResult(request, locale, { error: reason, next });
      }
    }

    return redirectToResult(request, locale, { status: "success", next });
  } catch {
    console.warn(
      callbackFailureLogPayload("verification_unknown"),
    );
    return redirectToResult(request, locale, {
      error: "verification_unknown",
      next,
    });
  }
}

function providerErrorFromQuery(
  searchParams: URLSearchParams,
): VerificationErrorCode {
  const code = searchParams.get("error_code")?.toLowerCase() ?? "";
  if (code.includes("expired")) return "verification_expired";
  if (code.includes("invalid")) return "verification_invalid";
  return "verification_exchange_failed";
}

function redirectToResult(
  request: NextRequest,
  locale: "zh" | "en",
  params: {
    status?: "success";
    error?: VerificationErrorCode;
    next?: string;
  },
) {
  const url = request.nextUrl.clone();
  url.pathname = locale === "zh" ? "/verify" : `/${locale}/verify`;
  url.search = "";
  if (params.status) url.searchParams.set("status", params.status);
  if (params.error) url.searchParams.set("error", params.error);
  url.searchParams.set("next", params.next ?? safeHomePath(locale));
  return NextResponse.redirect(url);
}

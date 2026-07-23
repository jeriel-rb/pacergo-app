import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupportedOtpType, normalizeLocale } from "@/lib/auth-callback";
import {
  mapPasswordRecoveryCallbackError,
  passwordResetLogPayload,
  RECOVERY_SESSION_COOKIE,
  RECOVERY_SESSION_MAX_AGE_SECONDS,
  safeNewPasswordPath,
  type PasswordUpdateErrorCode,
} from "@/lib/password-reset";

type RouteContext = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(routeLocale);
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.has("error")) {
    return redirectToNewPassword(request, locale, {
      error: providerErrorFromQuery(searchParams),
    });
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !tokenHash) {
    return redirectToNewPassword(request, locale, {
      error: "password_update_session_missing",
    });
  }

  if (tokenHash && (!isSupportedOtpType(type) || type !== "recovery")) {
    return redirectToNewPassword(request, locale, {
      error: "password_update_link_invalid",
    });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const reason = mapPasswordRecoveryCallbackError(error);
        console.warn(
          passwordResetLogPayload("auth_password_recovery_failed", reason, error),
        );
        return redirectToNewPassword(request, locale, { error: reason });
      }
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (error) {
        const reason = mapPasswordRecoveryCallbackError(error);
        console.warn(
          passwordResetLogPayload("auth_password_recovery_failed", reason, error),
        );
        return redirectToNewPassword(request, locale, { error: reason });
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectToNewPassword(request, locale, {
        error: "password_update_session_missing",
      });
    }

    return redirectToNewPassword(request, locale, { recoveryReady: true });
  } catch {
    console.warn(
      passwordResetLogPayload(
        "auth_password_recovery_failed",
        "password_update_unknown",
      ),
    );
    return redirectToNewPassword(request, locale, {
      error: "password_update_unknown",
    });
  }
}

function providerErrorFromQuery(
  searchParams: URLSearchParams,
): PasswordUpdateErrorCode {
  const code = searchParams.get("error_code")?.toLowerCase() ?? "";
  if (code.includes("expired")) return "password_update_link_expired";
  if (code.includes("already") || code.includes("used")) {
    return "password_update_link_used";
  }
  if (code.includes("invalid")) return "password_update_link_invalid";
  return "password_update_failed";
}

function redirectToNewPassword(
  request: NextRequest,
  locale: "zh" | "en",
  params: {
    recoveryReady?: boolean;
    error?: PasswordUpdateErrorCode;
  },
) {
  const url = request.nextUrl.clone();
  url.pathname = safeNewPasswordPath(locale);
  url.search = "";
  if (params.error) url.searchParams.set("error", params.error);

  const response = NextResponse.redirect(url);
  if (params.recoveryReady) {
    response.cookies.set(RECOVERY_SESSION_COOKIE, "1", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}

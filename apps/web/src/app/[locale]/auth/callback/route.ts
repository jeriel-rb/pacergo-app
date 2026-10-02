import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  callbackFailureLogPayload,
  isRecoveryAuthRequest,
  isSupportedOtpType,
  mapAuthCallbackError,
  normalizeLocale,
  safeHomePath,
  sanitizeInternalRedirect,
  type VerificationErrorCode,
} from "@/lib/auth-callback";
import { createRecoveryMarker } from "@/lib/recovery-marker";
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
  const next = sanitizeInternalRedirect(searchParams.get("next"), locale);

  if (isRecoveryAuthRequest(searchParams)) {
    return handleRecoveryCallback(request, locale);
  }

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

async function handleRecoveryCallback(
  request: NextRequest,
  locale: "zh" | "en",
) {
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.has("error")) {
    return redirectToNewPassword(request, locale, {
      error: passwordRecoveryProviderErrorFromQuery(searchParams),
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

    return redirectToNewPassword(request, locale, { recoveryUserId: user.id });
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
): VerificationErrorCode {
  const code = searchParams.get("error_code")?.toLowerCase() ?? "";
  if (code.includes("expired")) return "verification_expired";
  if (code.includes("invalid")) return "verification_invalid";
  return "verification_exchange_failed";
}

function passwordRecoveryProviderErrorFromQuery(
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
    /** Set once a recovery link was verified: issues the signed marker. */
    recoveryUserId?: string;
    error?: PasswordUpdateErrorCode;
  },
) {
  const url = request.nextUrl.clone();
  url.pathname = safeNewPasswordPath(locale);
  url.search = "";
  if (params.error) url.searchParams.set("error", params.error);

  const response = NextResponse.redirect(url);
  if (params.recoveryUserId) {
    response.cookies.set(RECOVERY_SESSION_COOKIE, createRecoveryMarker(params.recoveryUserId), {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: RECOVERY_SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
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

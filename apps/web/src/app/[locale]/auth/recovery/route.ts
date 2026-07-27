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

  const result = await verifyRecoveryRequest({ code, tokenHash });
  if (!result.success) {
    return redirectToNewPassword(request, locale, { error: result.error });
  }

  return redirectToNewPassword(request, locale, { recoveryReady: true });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(routeLocale);

  let body: { tokenHash?: unknown; type?: unknown };
  try {
    body = (await request.json()) as { tokenHash?: unknown; type?: unknown };
  } catch {
    return passwordRecoveryJsonFailure("password_update_session_missing", 400);
  }

  const tokenHash = typeof body.tokenHash === "string" ? body.tokenHash : null;
  const type = typeof body.type === "string" ? body.type : null;

  if (!tokenHash) {
    return passwordRecoveryJsonFailure("password_update_session_missing", 400);
  }

  if (!isSupportedOtpType(type) || type !== "recovery") {
    return passwordRecoveryJsonFailure("password_update_link_invalid", 400);
  }

  const result = await verifyRecoveryRequest({ tokenHash });
  if (!result.success) {
    return passwordRecoveryJsonFailure(result.error, 400);
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: safeNewPasswordPath(locale),
  });
  setRecoveryReadyCookie(response, request);
  return response;
}

async function verifyRecoveryRequest({
  code,
  tokenHash,
}: {
  code?: string | null;
  tokenHash?: string | null;
}): Promise<
  { success: true } | { success: false; error: PasswordUpdateErrorCode }
> {
  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return recoveryFailureFromProvider(error);
      }
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (error) {
        return recoveryFailureFromProvider(error);
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "password_update_session_missing" };
    }

    return { success: true };
  } catch {
    console.warn(
      passwordResetLogPayload(
        "auth_password_recovery_failed",
        "password_update_unknown",
      ),
    );
    return { success: false, error: "password_update_unknown" };
  }
}

function recoveryFailureFromProvider(
  error: Parameters<typeof mapPasswordRecoveryCallbackError>[0],
) {
  const reason = mapPasswordRecoveryCallbackError(error);
  console.warn(
    passwordResetLogPayload("auth_password_recovery_failed", reason, error),
  );
  return { success: false, error: reason } as const;
}

function passwordRecoveryJsonFailure(
  error: PasswordUpdateErrorCode,
  status: number,
) {
  return NextResponse.json({ success: false, error }, { status });
}

function setRecoveryReadyCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(RECOVERY_SESSION_COOKIE, "1", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_SESSION_MAX_AGE_SECONDS,
  });
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
    setRecoveryReadyCookie(response, request);
  }

  return response;
}

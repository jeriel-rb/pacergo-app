import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-errors";
import {
  mapPasswordUpdateError,
  passwordResetLogPayload,
  RECOVERY_SESSION_COOKIE,
  type PasswordUpdateErrorCode,
} from "@/lib/password-reset";

type RouteContext = { params: Promise<{ locale: string }> };

export async function POST(request: NextRequest, _context: RouteContext) {
  const hasRecoverySession =
    request.cookies.get(RECOVERY_SESSION_COOKIE)?.value === "1";

  if (!hasRecoverySession) {
    return passwordUpdateFailure("password_update_session_missing", 401, true);
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return passwordUpdateFailure("password_update_invalid_password", 400);
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return passwordUpdateFailure("password_update_invalid_password", 422);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return passwordUpdateFailure("password_update_session_missing", 401, true);
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const reason = mapPasswordUpdateError(error);
      return passwordUpdateFailure(reason, reason === "password_update_rate_limited" ? 429 : 400);
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn(
        passwordResetLogPayload(
          "auth_password_updated",
          "password_update_failed",
          signOutError,
        ),
      );
    } else {
      console.info(passwordResetLogPayload("auth_password_updated"));
    }

    const response = NextResponse.json({ success: true });
    response.headers.set("Cache-Control", "no-store");
    clearRecoveryCookie(response);
    return response;
  } catch {
    return passwordUpdateFailure("password_update_unknown", 500);
  }
}

function passwordUpdateFailure(
  error: PasswordUpdateErrorCode,
  status: number,
  clearSession = false,
) {
  const response = NextResponse.json({ success: false, error }, { status });
  response.headers.set("Cache-Control", "no-store");
  if (clearSession) clearRecoveryCookie(response);
  return response;
}

function clearRecoveryCookie(response: NextResponse) {
  response.cookies.set(RECOVERY_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

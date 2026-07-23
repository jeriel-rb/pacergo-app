"use client";

import { buildAuthCallbackUrl, getTrustedAppOrigin } from "@/lib/auth-callback";
import { getLocalizedPath } from "@/lib/locale-path";
import { buildPasswordRecoveryCallbackUrl } from "@/lib/password-reset";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

export const PENDING_VERIFICATION_EMAIL_KEY =
  "pacergo.pendingVerificationEmail";

export async function resendVerificationEmail(email: string, locale: string) {
  if (!SUPABASE_CONFIGURED) {
    throw createAuthActionError("auth_service_unavailable");
  }

  const supabase = createSupabaseBrowserClient();
  const origin = getTrustedAppOrigin(
    typeof window !== "undefined" ? window.location.origin : undefined,
  );
  const home = getLocalizedPath("/", locale);

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: origin
        ? buildAuthCallbackUrl({ origin, locale, next: home })
        : undefined,
    },
  });

  if (error) throw createAuthActionError("resend_failed", error);
}

export async function requestPasswordResetEmail(email: string, locale: string) {
  if (!SUPABASE_CONFIGURED) {
    throw createAuthActionError("auth_service_unavailable");
  }

  const supabase = createSupabaseBrowserClient();
  const origin = getTrustedAppOrigin(
    typeof window !== "undefined" ? window.location.origin : undefined,
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin
      ? buildPasswordRecoveryCallbackUrl({ origin, locale })
      : undefined,
  });

  if (error) throw createAuthActionError("password_reset_request_failed", error);
}

type AuthActionErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

function createAuthActionError(
  fallbackCode: string,
  error?: AuthActionErrorLike | null,
) {
  const actionError = new Error(error?.message ?? fallbackCode);
  actionError.name = "PacerGoAuthActionError";
  Object.assign(actionError, {
    code: error?.code ?? fallbackCode,
    status: error?.status,
  });
  return actionError;
}

export function rememberPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
}

export function readPendingVerificationEmail(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) ?? "";
}

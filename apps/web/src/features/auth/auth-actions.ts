"use client";

import { buildAuthCallbackUrl, getTrustedAppOrigin } from "@/lib/auth-callback";
import { getLocalizedPath } from "@/lib/locale-path";
import { buildPasswordRecoveryCallbackUrl } from "@/lib/password-reset";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { CONSENT_VERSIONS } from "@/lib/consent";

export const PENDING_VERIFICATION_EMAIL_KEY =
  "pacergo.pendingVerificationEmail";

// A10: sign-up consent (terms_of_service, privacy_policy, risk_disclosure) is
// NOT recorded via a client RPC call after signUp() returns — this app
// requires email verification, so signUp() almost always returns with no
// session yet, and the session only appears later in a DIFFERENT browsing
// context (the user clicks the verification link, typically in a new tab or
// even a different device). An earlier version of this deferred the write via
// sessionStorage + a flush-on-next-mount effect; that was wrong —
// sessionStorage does not survive a link click into a new tab, so the flush
// would silently never fire for most real users. Fixed at the source instead:
// signUpConsentMetadata() below builds the options.data payload passed
// straight into auth.signUp(), which Supabase writes to
// auth.users.raw_user_meta_data synchronously and server-side. The
// handle_new_user() trigger (0036_consent_pages.sql) reads it back and writes
// consent_records in the same transaction that creates the profile row — no
// session or client round-trip required after signup.
export function signUpConsentMetadata(): Record<string, string> {
  return {
    consent_terms_of_service: CONSENT_VERSIONS.terms_of_service,
    consent_privacy_policy: CONSENT_VERSIONS.privacy_policy,
    consent_risk_disclosure: CONSENT_VERSIONS.risk_disclosure,
  };
}

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

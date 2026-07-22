"use client";

import { buildAuthCallbackUrl, getTrustedAppOrigin } from "@/lib/auth-callback";
import { getLocalizedPath } from "@/lib/locale-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const PENDING_VERIFICATION_EMAIL_KEY =
  "pacergo.pendingVerificationEmail";

export async function resendVerificationEmail(email: string, locale: string) {
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

  if (error) throw error;
}

export function rememberPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
}

export function readPendingVerificationEmail(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) ?? "";
}

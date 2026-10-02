import type { Metadata } from "next";
import { cookies } from "next/headers";
import initTranslations from "@/app/i18n";
import {
  NewPasswordForm,
  PasswordResetStatusCard,
} from "@/features/auth/new-password-form";
import { normalizeLocale } from "@/lib/auth-callback";
import {
  RECOVERY_SESSION_COOKIE,
  type PasswordUpdateErrorCode,
} from "@/lib/password-reset";
import { isValidRecoveryMarker } from "@/lib/recovery-marker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";

const PASSWORD_UPDATE_ERRORS: PasswordUpdateErrorCode[] = [
  "password_update_session_missing",
  "password_update_link_expired",
  "password_update_link_invalid",
  "password_update_link_used",
  "password_update_invalid_password",
  "password_update_same_password",
  "password_update_rate_limited",
  "password_update_network_error",
  "password_update_failed",
  "password_update_unknown",
];

type NewPasswordParams = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({
  params,
}: NewPasswordParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({
    locale: normalizeLocale(locale),
    namespaces: ["auth"],
  });
  return { title: t("newPassword.metaTitle") };
}

export default async function NewPasswordPage({
  searchParams,
}: NewPasswordParams) {
  const query = await searchParams;
  const queryError = normalizePasswordUpdateError(query.error);
  if (queryError) {
    return <PasswordResetStatusCard error={queryError} />;
  }

  const cookieStore = await cookies();
  const recoveryMarker = cookieStore.get(RECOVERY_SESSION_COOKIE)?.value;
  if (!recoveryMarker || !SUPABASE_CONFIGURED) {
    return <PasswordResetStatusCard error="password_update_session_missing" />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isValidRecoveryMarker(recoveryMarker, user.id)) {
    return <PasswordResetStatusCard error="password_update_session_missing" />;
  }

  return <NewPasswordForm />;
}

function normalizePasswordUpdateError(
  value: string | undefined,
): PasswordUpdateErrorCode | null {
  return PASSWORD_UPDATE_ERRORS.includes(value as PasswordUpdateErrorCode)
    ? (value as PasswordUpdateErrorCode)
    : null;
}

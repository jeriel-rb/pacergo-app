import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { PasswordResetStatusCard } from "@/features/auth/new-password-form";
import { RecoveryConfirmForm } from "@/features/auth/recovery-confirm-form";
import { isSupportedOtpType, normalizeLocale } from "@/lib/auth-callback";

type RecoveryConfirmParams = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export async function generateMetadata({
  params,
}: RecoveryConfirmParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({
    locale: normalizeLocale(locale),
    namespaces: ["auth"],
  });
  return { title: t("newPassword.metaTitle") };
}

export default async function RecoveryConfirmPage({
  searchParams,
}: RecoveryConfirmParams) {
  const query = await searchParams;
  const tokenHash = query.token_hash;
  const type = query.type;

  if (!tokenHash) {
    return <PasswordResetStatusCard error="password_update_session_missing" />;
  }

  if (!isSupportedOtpType(type) || type !== "recovery") {
    return <PasswordResetStatusCard error="password_update_link_invalid" />;
  }

  return <RecoveryConfirmForm tokenHash={tokenHash} type={type} />;
}

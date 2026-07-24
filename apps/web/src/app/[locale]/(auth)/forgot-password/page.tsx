import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { normalizeLocale } from "@/lib/auth-callback";

type ForgotPasswordParams = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ForgotPasswordParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({
    locale: normalizeLocale(locale),
    namespaces: ["auth"],
  });
  return { title: t("forgot.metaTitle") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}

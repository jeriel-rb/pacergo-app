import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { VerificationPendingView } from "@/features/auth/verification-pending-view";
import { normalizeLocale } from "@/lib/auth-callback";

type VerifyPendingParams = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: VerifyPendingParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({
    locale: normalizeLocale(locale),
    namespaces: ["auth"],
  });
  return { title: t("pending.metaTitle") };
}

export default function VerifyPendingPage() {
  return <VerificationPendingView />;
}

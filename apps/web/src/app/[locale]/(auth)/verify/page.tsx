import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import initTranslations from "@/app/i18n";
import { buttonVariants } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  normalizeLocale,
  safeHomePath,
  sanitizeInternalRedirect,
  type VerificationErrorCode,
} from "@/lib/auth-callback";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const ERRORS: VerificationErrorCode[] = [
  "verification_missing_parameters",
  "verification_invalid",
  "verification_expired",
  "verification_already_used",
  "verification_exchange_failed",
  "verification_unknown",
];

type VerifyParams = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; error?: string; next?: string }>;
};

export async function generateMetadata({
  params,
}: VerifyParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({
    locale: normalizeLocale(locale),
    namespaces: ["auth"],
  });
  return { title: t("verification.metaTitle") };
}

export default async function VerifyPage({ params, searchParams }: VerifyParams) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = normalizeLocale(rawLocale);
  const { t } = await initTranslations({ locale, namespaces: ["auth"] });
  const isSuccess = query.status === "success";
  const error = normalizeError(query.error);
  const next = sanitizeInternalRedirect(query.next, locale);
  const home = safeHomePath(locale);
  const signIn = getLocalizedPath("/sign-in", locale);
  const resend = getLocalizedPath("/verify-pending", locale);
  const canResend = [
    "verification_expired",
    "verification_exchange_failed",
    "verification_unknown",
  ].includes(error);
  const primaryHref = isSuccess ? next || home : canResend ? resend : signIn;

  return (
    <Card className="w-full max-w-sm space-y-5 p-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
        {isSuccess ? <CheckCircle2 size={28} /> : <CircleAlert size={28} />}
      </span>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">
          {isSuccess
            ? t("verification.successTitle")
            : t(`verification.errors.${error}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSuccess
            ? t("verification.successBody")
            : t(`verification.errors.${error}.body`)}
        </p>
      </div>

      <Link
        href={primaryHref}
        className={cn(buttonVariants(), "h-11 w-full rounded-xl")}
      >
        {isSuccess
          ? t("verification.continue")
          : canResend
            ? t("verification.resend")
            : t("verification.signIn")}
      </Link>

      {!isSuccess && canResend && (
        <Link
          href={signIn}
          className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {t("verification.signIn")}
        </Link>
      )}
    </Card>
  );
}

function normalizeError(value: string | undefined): VerificationErrorCode {
  return ERRORS.includes(value as VerificationErrorCode)
    ? (value as VerificationErrorCode)
    : "verification_unknown";
}

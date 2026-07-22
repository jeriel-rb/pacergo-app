import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import initTranslations from "@/app/i18n";
import { buttonVariants } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { normalizeLocale } from "@/lib/auth-callback";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

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

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordParams) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const { t } = await initTranslations({ locale, namespaces: ["auth"] });

  return (
    <Card className="w-full max-w-[25rem] space-y-5 p-6 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <KeyRound size={28} />
      </span>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-primary">
          {t("brand")}
        </p>
        <h1 className="text-2xl font-bold">{t("forgot.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("forgot.body")}
        </p>
      </div>

      <Link
        href={getLocalizedPath("/sign-in", locale)}
        className={cn(buttonVariants(), "h-11 w-full rounded-xl")}
      >
        {t("forgot.backToSignIn")}
      </Link>
    </Card>
  );
}

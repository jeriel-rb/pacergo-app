import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { EarnContent } from "./earn-content";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["nav", "earn"] });
  return {
    title: t("menu.earn_label"),
    description: t("hero.sub", { ns: "earn" }),
  };
}

export default function EarnPage() {
  return <EarnContent />;
}

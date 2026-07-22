import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { getSeoAlternates } from "@/lib/seo";
import { EarnContent } from "./earn-content";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["earn"] });
  const title = t("metadata.title");
  const description = t("metadata.description");
  const alternates = getSeoAlternates("/earn", locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "PacerGo",
      locale: locale === "zh" ? "zh_TW" : "en_US",
      url: alternates.canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function EarnPage() {
  return <EarnContent />;
}

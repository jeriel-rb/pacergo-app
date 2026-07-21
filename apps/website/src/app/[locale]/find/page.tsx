import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { FindContent } from "./find-content";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["find"] });
  const title = t("metadata.title");
  const description = t("metadata.description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "PacerGo",
      locale: locale === "zh" ? "zh_TW" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function FindPage() {
  return <FindContent />;
}

import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { FindContent } from "./find-content";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["nav", "find"] });
  return {
    title: t("menu.find_label"),
    description: t("hero.sub", { ns: "find" }),
  };
}

export default function FindPage() {
  return <FindContent />;
}

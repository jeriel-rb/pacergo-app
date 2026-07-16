import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { ContactContent } from "./contact-content";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["contact"] });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export default function ContactPage() {
  return <ContactContent />;
}

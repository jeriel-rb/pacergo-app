import type { Metadata } from "next";
import initTranslations from "@/app/i18n";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { WaitlistPanel } from "@/components/site/waitlist-panel";

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["waitlist"] });
  return {
    title: `${t("title_1")}${t("title_highlight")}`.trim(),
    description: t("sub"),
  };
}

export default function WaitlistPage() {
  return (
    <>
      <SiteNav />
      <main>
        <WaitlistPanel />
      </main>
      <SiteFooter />
    </>
  );
}

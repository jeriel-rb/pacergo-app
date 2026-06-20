import type { Metadata, Viewport } from "next";
import initTranslations from "@/app/i18n";
import i18nConfig from "@/i18nConfig";
import { TranslationsProvider } from "@/components/translations-provider";

const NAMESPACES = ["common", "nav", "home", "footer", "find", "earn"];

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return i18nConfig.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["common"] });

  const title = t("metadata.title");
  const description = t("metadata.description");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Pacergo",
      locale: locale === "zh" ? "zh_TW" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  const htmlLang = locale === "zh" ? "zh-Hant-TW" : "en";

  const { resources } = await initTranslations({ locale, namespaces: NAMESPACES });

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body>
        <TranslationsProvider locale={locale} namespaces={NAMESPACES} resources={resources}>
          {children}
        </TranslationsProvider>
      </body>
    </html>
  );
}

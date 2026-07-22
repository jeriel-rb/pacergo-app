import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import initTranslations from "@/app/i18n";
import i18nConfig from "@/i18nConfig";
import { TranslationsProvider } from "@/components/translations-provider";
import { getSeoAlternates } from "@/lib/seo";

const NAMESPACES = ["common", "nav", "home", "footer", "find", "earn", "contact"];

type LocaleParams = { params: Promise<{ locale: string }> };

function isSupportedLocale(locale: string) {
  return i18nConfig.locales.includes(locale);
}

export function generateStaticParams() {
  return i18nConfig.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return {};
  }

  const { t } = await initTranslations({ locale, namespaces: ["common"] });

  const title = t("metadata.title");
  const description = t("metadata.description");
  const alternates = getSeoAlternates("/", locale);

  return {
    title: {
      default: title,
      template: "%s - PacerGo",
    },
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

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  const htmlLang = locale === "zh" ? "zh-Hant-TW" : "en";

  const { resources } = await initTranslations({ locale, namespaces: NAMESPACES });

  return (
    <html lang={htmlLang} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <TranslationsProvider locale={locale} namespaces={NAMESPACES} resources={resources}>
          {children}
        </TranslationsProvider>
      </body>
    </html>
  );
}

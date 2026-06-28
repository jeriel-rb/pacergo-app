import type { Metadata, Viewport } from "next";
import initTranslations from "@/app/i18n";
import i18nConfig from "@/i18nConfig";
import { TranslationsProvider } from "@/components/translations-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const NAMESPACES = [
  "common",
  "nav",
  "home",
  "trainer",
  "auth",
  "settings",
  "profile",
  "aiPlan",
  "sessions",
  "notifications",
  "chat",
];

type LocaleParams = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return i18nConfig.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#1565ff",
};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await initTranslations({ locale, namespaces: ["common"] });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
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
      <body className="min-h-screen">
        <ThemeProvider>
          <TranslationsProvider
            locale={locale}
            namespaces={NAMESPACES}
            resources={resources}
          >
            {children}
          </TranslationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import { I18nextProvider } from "react-i18next";
import { createInstance, type Resource } from "i18next";
import initTranslations from "@/app/i18n";

interface TranslationsProviderProps {
  children: React.ReactNode;
  locale: string;
  namespaces: string[];
  resources?: Resource;
}

export function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}: TranslationsProviderProps) {
  const i18n = createInstance();

  // Synchronous because `resources` are preloaded server-side, so `t()` is
  // ready on first render and the SSR HTML is already translated.
  initTranslations({ locale, namespaces, i18nInstance: i18n, resources });

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

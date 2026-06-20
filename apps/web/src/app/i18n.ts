import { createInstance, type i18n as I18nInstance, type Resource } from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import resourcesToBackend from "i18next-resources-to-backend";
import i18nConfig from "@/i18nConfig";

export interface InitTranslationsOptions {
  locale: string;
  namespaces: string[];
  i18nInstance?: I18nInstance;
  resources?: Resource;
}

export interface InitTranslationsResult {
  i18n: I18nInstance;
  resources: { [locale: string]: Resource };
  t: I18nInstance["t"];
}

export default async function initTranslations({
  locale,
  namespaces,
  i18nInstance,
  resources,
}: InitTranslationsOptions): Promise<InitTranslationsResult> {
  const instance = i18nInstance || createInstance();

  instance.use(initReactI18next);

  if (!resources) {
    instance.use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`@/locales/${language}/${namespace}.json`) as Promise<Resource>,
      ),
    );
  }

  await instance.init({
    lng: locale,
    resources,
    fallbackLng: i18nConfig.defaultLocale,
    supportedLngs: i18nConfig.locales,
    defaultNS: namespaces[0],
    fallbackNS: namespaces[0],
    ns: namespaces,
    preload: resources ? [] : i18nConfig.locales,
    interpolation: { escapeValue: false },
  });

  return {
    i18n: instance,
    resources: {
      [locale]: instance.services.resourceStore.data[locale] as Resource,
    },
    t: instance.t,
  };
}

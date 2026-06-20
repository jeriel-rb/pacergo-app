/** Must match `next-i18n-router` + client `setPreferredLocaleCookie` (middleware reads this cookie). */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/** Taiwan (Traditional Chinese) is the default; English is the alternate. */
const i18nConfig = {
  locales: ["zh", "en"],
  defaultLocale: "zh",
  prefixDefault: false,
  localeCookie: LOCALE_COOKIE_NAME,
};

export default i18nConfig;

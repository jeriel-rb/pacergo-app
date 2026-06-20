/** Must match `next-i18n-router` + client `setPreferredLocaleCookie` (middleware reads this cookie). */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/** Taiwan (Traditional Chinese) is the default; English is the alternate. */
const i18nConfig = {
  locales: ["zh", "en"],
  defaultLocale: "zh",
  prefixDefault: false,
  localeCookie: LOCALE_COOKIE_NAME,
  // Don't auto-redirect by the browser's Accept-Language. Taiwan zh is the
  // landing default for everyone; visitors opt into English via the switcher
  // (which sets the NEXT_LOCALE cookie, still honored above detection).
  localeDetector: false as const,
};

export default i18nConfig;

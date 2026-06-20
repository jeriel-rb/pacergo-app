import i18nConfig, { LOCALE_COOKIE_NAME } from "@/i18nConfig";

/**
 * Persists locale choice so middleware uses it on unprefixed URLs (`/` for zh).
 * Without this, `Accept-Language` can override the UI right after switching.
 */
export function setPreferredLocaleCookie(locale: string) {
  if (typeof document === "undefined") return;
  if (!i18nConfig.locales.includes(locale)) return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

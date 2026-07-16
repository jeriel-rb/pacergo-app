import i18nConfig from "@/i18nConfig";

/** Current locale from a pathname. The default locale has no URL prefix (prefixDefault: false). */
export function getCurrentLocale(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  if (m && i18nConfig.locales.includes(m[1])) return m[1];
  return i18nConfig.defaultLocale;
}

/**
 * Strip a leading locale segment. Must only strip real locales — a naive
 * `/^\/[a-z]{2}/` would turn `/tiers` into `ers` (`/ti` + `ers`).
 */
function pathWithoutLeadingLocale(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  if (m && i18nConfig.locales.includes(m[1])) {
    return pathname.slice(m[0].length) || "/";
  }
  return pathname;
}

/** Localize an href that may carry a hash fragment ("/#how" → "/en#how"). */
export function getLocalizedHref(href: string, locale: string): string {
  const [path, hash] = href.split("#");
  const localized = getLocalizedPath(path || "/", locale);
  return hash ? `${localized}#${hash}` : localized;
}

/** Same route in another locale (matches next-i18n-router + i18nConfig prefix rules). */
export function getLocalizedPath(pathname: string, locale: string): string {
  const stripped = pathWithoutLeadingLocale(pathname);

  if (!i18nConfig.prefixDefault && locale === i18nConfig.defaultLocale) {
    return stripped;
  }
  if (stripped === "/") return `/${locale}`;
  return `/${locale}${stripped}`;
}

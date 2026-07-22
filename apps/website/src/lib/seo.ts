const WEBSITE_ORIGIN = "https://pacergo.app";

export function getSeoAlternates(pathname: "/" | "/find" | "/earn" | "/contact", locale: string) {
  const zhPath = pathname;
  const enPath = pathname === "/" ? "/en" : `/en${pathname}`;
  const canonicalPath = locale === "en" ? enPath : zhPath;

  return {
    canonical: new URL(canonicalPath, WEBSITE_ORIGIN).toString(),
    languages: {
      "zh-TW": new URL(zhPath, WEBSITE_ORIGIN).toString(),
      en: new URL(enPath, WEBSITE_ORIGIN).toString(),
      "x-default": new URL(zhPath, WEBSITE_ORIGIN).toString(),
    },
  };
}

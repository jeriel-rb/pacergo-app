"use client";

import { useTranslation } from "react-i18next";

/** Current UI locale narrowed to the two app locales. */
export function useLocale(): "zh" | "en" {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("zh") ? "zh" : "en";
}

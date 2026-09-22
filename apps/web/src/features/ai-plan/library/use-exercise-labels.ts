"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/shared/hooks/use-locale";
import type { ExerciseCatalogEntry } from "@/shared/assets/exercise-catalog";
import zhNames from "@/shared/assets/exercise-names.zh.json";
import { libraryKey } from "./library-filter";

const ZH_NAMES = zhNames as Record<string, string>;

/** Localized display text for catalog exercises: their name (Traditional
 *  Chinese for zh, the upstream English name otherwise) and the equipment /
 *  muscle labels from `plan.json` → `library.*`. */
export function useExerciseLabels() {
  const { t } = useTranslation("plan");
  const locale = useLocale();

  const nameOf = React.useCallback(
    (e: ExerciseCatalogEntry) => (locale === "zh" ? (ZH_NAMES[e.slug] ?? e.name) : e.name),
    [locale],
  );
  const labelOf = React.useCallback(
    (kind: "equipment" | "muscle", value: string) => t(`library.${kind}.${libraryKey(value)}`),
    [t],
  );

  return { nameOf, labelOf, locale };
}

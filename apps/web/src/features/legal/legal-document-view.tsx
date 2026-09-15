"use client";

import { useTranslation } from "react-i18next";
import { CONSENT_VERSIONS, type ConsentSlug } from "@/lib/consent";
import { PlanMarkdown } from "@/features/ai-plan/plan-markdown";

/** Renders one legal/consent document (A-10). Shared by all four slugs —
 *  ToS, Privacy, risk disclosure, partner conduct rules — since they only
 *  differ in which i18n keys they read (`legal.json`'s `<slug>.title` /
 *  `<slug>.body`, supplied verbatim by the client). */
export function LegalDocumentView({ slug }: { slug: ConsentSlug }) {
  const { t } = useTranslation("legal");

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold lg:text-3xl">
          {t(`${slug}.title`)}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("version", { version: CONSENT_VERSIONS[slug] })}
        </p>
      </header>

      <PlanMarkdown markdown={t(`${slug}.body`)} />
    </article>
  );
}

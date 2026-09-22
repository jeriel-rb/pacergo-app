"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CONSENT_VERSIONS, type ConsentSlug } from "@/lib/consent";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";
import { PlanMarkdown } from "@/features/ai-plan/plan-markdown";

/** Documents that carry the "Open-source credits & licenses" link. */
const CREDITS_LINK_SLUGS: readonly ConsentSlug[] = ["terms_of_service", "privacy_policy"];

/** Renders one legal/consent document (A-10). Shared by all four slugs —
 *  ToS, Privacy, risk disclosure, partner conduct rules — since they only
 *  differ in which i18n keys they read (`legal.json`'s `<slug>.title` /
 *  `<slug>.body`, supplied verbatim by the client). */
export function LegalDocumentView({ slug }: { slug: ConsentSlug }) {
  const { t } = useTranslation("legal");
  const { t: tCommon } = useTranslation("common");
  const locale = useLocale();

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

      {/* Open-source attribution (CC BY-SA illustrations) lives here rather
          than in the product UI: linked from the two documents users read
          for "what this app is built on / what it collects". Not part of the
          consent text, so it doesn't touch CONSENT_VERSIONS. */}
      {CREDITS_LINK_SLUGS.includes(slug) && (
        <footer className="border-t border-border pt-4 text-sm">
          <Link
            href={getLocalizedPath("/credits", locale)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {tCommon("credits.footerLink")}
          </Link>
        </footer>
      )}
    </article>
  );
}

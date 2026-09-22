"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getLocalizedPath } from "@/lib/locale-path";
import { useLocale } from "@/shared/hooks/use-locale";

const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/";

const EXTERNAL_LINKS = [
  { key: "linkWorkoutGuide", href: "https://github.com/bryllim/workout-guide" },
  { key: "linkEverkinetic", href: "https://github.com/everkinetic/data" },
  { key: "linkLicense", href: CC_BY_SA },
] as const;

const SHIPPED_LINKS = [
  { key: "linkAttribution", href: "/exercise-art/ATTRIBUTION.md" },
  { key: "linkManifest", href: "/exercise-art/manifest.json" },
] as const;

const linkClass = "font-medium text-primary underline-offset-2 hover:underline";

/** Public credits page: the CC BY-SA attribution for the exercise/equipment
 *  illustrations (credit, license link, and a statement of changes). Kept
 *  separate from the client-supplied legal documents so it can change without
 *  bumping consent versions. */
export function CreditsView() {
  const { t } = useTranslation("common");
  const { t: tLegal } = useTranslation("legal");
  const locale = useLocale();

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold lg:text-3xl">{t("credits.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("credits.intro")}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("credits.artHeading")}</h2>
        <p className="text-sm leading-relaxed">{t("credits.artBody")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("credits.changesHeading")}</h2>
        <p className="text-sm leading-relaxed">{t("credits.changesBody")}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("credits.licenseNote")}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("credits.linksHeading")}</h2>
        <ul className="space-y-1.5 text-sm">
          {EXTERNAL_LINKS.map((l) => (
            <li key={l.key}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t(`credits.${l.key}`)}
              </a>
            </li>
          ))}
          {SHIPPED_LINKS.map((l) => (
            <li key={l.key}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t(`credits.${l.key}`)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("credits.legalHeading")}</h2>
        <p className="text-sm text-muted-foreground">{t("credits.legalBody")}</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            <Link href={getLocalizedPath("/legal/terms_of_service", locale)} className={linkClass}>
              {tLegal("terms_of_service.linkLabel")}
            </Link>
          </li>
          <li>
            <Link href={getLocalizedPath("/legal/privacy_policy", locale)} className={linkClass}>
              {tLegal("privacy_policy.linkLabel")}
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}

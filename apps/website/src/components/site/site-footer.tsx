"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedHref } from "@/lib/locale-path";
import { Wordmark } from "./wordmark";

type FooterLink = { label: string; href?: string };
type Column = { heading: string; links: FooterLink[] };

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

export function SiteFooter() {
  const { t } = useTranslation("footer");
  const locale = getCurrentLocale(usePathname());
  const columns = t("columns", { returnObjects: true }) as Record<string, Column>;

  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark className="text-lg text-ink" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/55">{t("tagline")}</p>
          </div>

          {Object.values(columns).map((col) => (
            <div key={col.heading}>
              <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/45">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href && isExternalHref(link.href) ? (
                      <a
                        href={link.href}
                        className="text-sm text-ink/65 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
                      >
                        {link.label}
                      </a>
                    ) : link.href ? (
                      <Link
                        href={getLocalizedHref(link.href, locale)}
                        className="text-sm text-ink/65 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      // Page doesn't exist yet — render as quiet text, not a dead link.
                      <span className="text-sm text-ink/40">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-ink/10 pt-6 text-xs text-ink/45 sm:flex-row sm:items-center">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <p className="font-mono uppercase tracking-[0.16em]">{t("motto")}</p>
        </div>
      </div>
    </footer>
  );
}

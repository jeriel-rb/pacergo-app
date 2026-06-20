"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Wordmark } from "./wordmark";
import { LanguageSwitcher } from "./language-switcher";

export function SiteNav() {
  const { t } = useTranslation("nav");

  const links = [
    { href: "#how", label: t("how") },
    { href: "#tiers", label: t("tiers") },
    { href: "#safety", label: t("safety") },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-ink/8 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="#top" className="text-lg text-ink" aria-label="Pacergo">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a
              href="#waitlist"
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-ink px-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              {t("waitlist")}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}

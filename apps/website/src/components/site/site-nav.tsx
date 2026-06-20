"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { Wordmark } from "./wordmark";
import { LanguageSwitcher } from "./language-switcher";
import { ProductMenu } from "./product-menu";

export function SiteNav() {
  const { t } = useTranslation("nav");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const home = getLocalizedPath("/", locale);

  // Section anchors live on the homepage, so link back to it from any page.
  const links = [
    { href: `${home}#how`, label: t("how") },
    { href: `${home}#safety`, label: t("safety") },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-ink/8 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href={home} className="text-lg text-ink" aria-label="Pacergo">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <ProductMenu />
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href={`${home}#waitlist`}
              className="inline-flex h-9 items-center rounded-(--radius) bg-ink px-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-px"
            >
              {t("waitlist")}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

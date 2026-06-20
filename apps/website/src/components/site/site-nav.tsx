"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { Wordmark } from "./wordmark";
import { LanguageSwitcher } from "./language-switcher";
import { ProductMenu } from "./product-menu";
import { LifterGlyph } from "./illustrations";

export function SiteNav() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const home = getLocalizedPath("/", locale);
  const find = getLocalizedPath("/find", locale);
  const earn = getLocalizedPath("/earn", locale);

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Section anchors live on the homepage, so link back to it from any page.
  const sectionLinks = [
    { href: `${home}#how`, label: t("how") },
    { href: `${home}#safety`, label: t("safety") },
  ];

  const audience = [
    { href: find, label: t("menu.find_label"), desc: t("menu.find_desc"), Icon: UserSearch },
    { href: earn, label: t("menu.earn_label"), desc: t("menu.earn_desc"), Icon: LifterGlyph },
  ];

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-ink/8 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href={home} className="text-lg text-ink" aria-label="Pacergo" onClick={close}>
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <ProductMenu />
            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher className="hidden md:inline-flex" />
            <Link
              href={`${home}#waitlist`}
              className="hidden h-9 items-center rounded-(--radius) bg-ink px-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-px md:inline-flex"
            >
              {t("waitlist")}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={t("product")}
              aria-expanded={open}
              className="inline-flex size-9 items-center justify-center rounded-(--radius) border border-ink/12 text-ink md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="animate-rise border-b border-ink/10 bg-paper shadow-[0_24px_40px_-24px_rgba(10,10,10,0.25)] md:hidden">
          <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
            <div>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-ink/45">
                {t("product")}
              </p>
              <div className="mt-3 grid gap-2">
                {audience.map(({ href, label, desc, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="flex items-start gap-3 rounded-xl border border-ink/10 p-3 transition-colors hover:border-ink/25"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">{desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-1 border-t border-ink/10 pt-4">
              {sectionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-ink/10 pt-4">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-ink/45">
                {tc("language.label")}
              </span>
              <LanguageSwitcher />
            </div>

            <Link
              href={`${home}#waitlist`}
              onClick={close}
              className="flex h-11 items-center justify-center rounded-(--radius) bg-ink text-sm font-semibold text-paper"
            >
              {t("waitlist")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

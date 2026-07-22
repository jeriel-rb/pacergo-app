"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Menu, Sparkles, UserSearch, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { getWebAppSignInUrl } from "@/lib/web-app-links";
import { Wordmark } from "./wordmark";
import { LanguageSwitcher } from "./language-switcher";
import { ProductMenu } from "./product-menu";

export function SiteNav() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const home = getLocalizedPath("/", locale);
  const find = getLocalizedPath("/find", locale);
  const earn = getLocalizedPath("/earn", locale);
  const startFree = getWebAppSignInUrl("header");

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Section anchors live on the homepage, so link back to it from any page.
  const productLinks = [
    { href: `${home}#ai-coach`, label: t("menu.ai_coach"), Icon: Sparkles },
    { href: find, label: t("menu.find_partner"), Icon: UserSearch },
    { href: `${home}#progress`, label: t("menu.progress"), Icon: Activity },
  ];

  const primaryLinks = [
    { href: `${home}#how-it-works`, label: t("how") },
    { href: `${home}#safety`, label: t("safety") },
    { href: earn, label: t("become_partner") },
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const menuButtonLabel = useMemo(() => (open ? t("close_menu") : t("open_menu")), [open, t]);

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-ink/8 bg-paper/80 backdrop-blur-md">
        {/* 3-column grid keeps the middle links optically centered regardless of
            how wide the wordmark and the right-hand controls are. */}
        <nav className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6">
          <Link
            href={home}
            className="justify-self-start text-lg text-ink"
            aria-label="PacerGo"
            onClick={close}
          >
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-8 justify-self-center md:flex">
            <ProductMenu />
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink/65 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="col-start-3 flex items-center gap-2 justify-self-end sm:gap-3">
            <LanguageSwitcher className="hidden md:inline-flex" />
            <a
              href={startFree}
              className="hidden h-9 items-center rounded-(--radius) bg-ink px-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:inline-flex"
            >
              {t("start_free")}
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={menuButtonLabel}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              className="inline-flex size-9 items-center justify-center rounded-(--radius) border border-ink/12 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* mobile menu */}
      {open && (
        <div
          id="mobile-navigation"
          className="animate-rise max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden border-b border-ink/10 bg-paper shadow-[0_24px_40px_-24px_rgba(10,10,10,0.25)] md:hidden"
        >
          <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
            <div>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-ink/45">
                {t("product")}
              </p>
              <div className="mt-3 grid gap-2">
                {productLinks.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="flex items-start gap-3 rounded-xl border border-ink/10 p-3 transition-colors hover:border-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{label}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-1 border-t border-ink/10 pt-4">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="rounded-(--radius) py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
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

            <a
              href={startFree}
              onClick={close}
              className="flex h-11 items-center justify-center rounded-(--radius) bg-ink text-sm font-semibold text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
            >
              {t("start_free")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

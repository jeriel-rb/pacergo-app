"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18nConfig from "@/i18nConfig";
import { setPreferredLocaleCookie } from "@/lib/locale-cookie";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const SHORT_LABEL: Record<string, string> = { zh: "中文", en: "EN" };

/** Locale dropdown: the trigger shows only the active language; the menu lists the rest. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const router = useRouter();
  const current = getCurrentLocale(pathname);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const switchTo = useCallback(
    (locale: string) => {
      setOpen(false);
      if (locale === current) return;
      setPreferredLocaleCookie(locale);
      router.push(getLocalizedPath(pathname, locale));
    },
    [current, pathname, router],
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/12 px-3 text-xs font-semibold text-ink transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
      >
        <Globe className="size-3.5 text-ink/55" />
        {SHORT_LABEL[current] ?? current.toUpperCase()}
        <ChevronDown
          className={cn("size-3.5 text-ink/45 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language.label")}
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-ink/10 bg-paper p-1.5 shadow-[0_24px_60px_-24px_rgba(10,10,10,0.35)]"
        >
          {i18nConfig.locales.map((locale) => {
            const active = locale === current;
            return (
              <li key={locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => switchTo(locale)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    active ? "font-semibold text-ink" : "text-ink/65 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {t(`language.${locale}`)}
                  {active && <Check className="size-4 text-brand" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

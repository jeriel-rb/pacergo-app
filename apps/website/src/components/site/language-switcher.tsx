"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import i18nConfig from "@/i18nConfig";
import { setPreferredLocaleCookie } from "@/lib/locale-cookie";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const SHORT_LABEL: Record<string, string> = { zh: "中文", en: "EN" };

/** Compact two-state locale toggle that mirrors the site's minimalist style. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = getCurrentLocale(pathname);

  const switchTo = useCallback(
    (locale: string) => {
      if (locale === current) return;
      setPreferredLocaleCookie(locale);
      router.push(getLocalizedPath(pathname, locale));
    },
    [current, pathname, router],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-ink/12 p-0.5",
        className,
      )}
    >
      {i18nConfig.locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchTo(locale)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              active ? "bg-ink text-paper" : "text-ink/55 hover:text-ink",
            )}
          >
            {SHORT_LABEL[locale] ?? locale.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

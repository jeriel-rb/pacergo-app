"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@pacergo/shared";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";
import { SettingsSheet } from "@/features/settings/settings-sheet";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/** Sticky top bar: wordmark, inline nav on desktop, and the settings entry. */
export function AppHeader({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const { t } = useTranslation("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-4 px-4 lg:max-w-5xl lg:px-6">
        <Link
          href={getLocalizedPath("/", locale)}
          className="flex items-center gap-2 font-bold tracking-tight text-foreground"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            P
          </span>
          <span className="text-lg">Pacergo</span>
        </Link>

        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(stripped, item.href);
            return (
              <Link
                key={item.key}
                href={getLocalizedPath(item.href, locale)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <SettingsSheet user={user} />
        </div>
      </div>
    </header>
  );
}

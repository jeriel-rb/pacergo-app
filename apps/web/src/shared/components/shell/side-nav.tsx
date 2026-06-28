"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@pacergo/shared";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { SettingsSheet } from "@/features/settings/settings-sheet";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/** Persistent desktop sidebar nav (lg+). Replaces the top nav on wide screens. */
export function SideNav({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const { t } = useTranslation("nav");

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link
          href={getLocalizedPath("/", locale)}
          className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            P
          </span>
          <span className="text-lg">Pacergo</span>
        </Link>
      </div>

      <nav aria-label={t("menu")} className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.key}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50"
              >
                <Icon size={20} />
                {t(item.key)}
                <SoonBadge className="ml-auto" />
              </div>
            );
          }

          const active = isNavItemActive(stripped, item.href);
          return (
            <Link
              key={item.key}
              href={getLocalizedPath(item.href, locale)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon size={20} className={active ? "text-primary" : undefined} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {user && (
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <InitialAvatar
              name={user.display_name}
              src={user.photo_url}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user.display_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SettingsSheet user={user} />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import type { UserProfile } from "@pacergo/shared";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";
import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
} from "./admin-nav-items";
import type { ShellNavItem } from "./shell-nav-item";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { SettingsSheet } from "@/features/settings/settings-sheet";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

type SideNavProps =
  | {
      variant?: "app";
      user: UserProfile | null;
      unreadCount?: number;
    }
  | {
      variant: "admin";
      user?: never;
      unreadCount?: never;
    };

/** Persistent desktop sidebar nav (lg+). Replaces the top nav on wide screens. */
export function SideNav(props: SideNavProps) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const isAdmin = props.variant === "admin";

  const { t } = useTranslation(isAdmin ? "admin" : "nav");
  // Settings lives in the footer (and mobile bottom bar) — not as a nav link.
  const items: ShellNavItem[] = isAdmin
    ? ADMIN_NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.key !== "settings");
  const isItemActive = isAdmin ? isAdminNavItemActive : isNavItemActive;
  const menuLabel = isAdmin ? t("nav.menu") : t("menu");
  const brandHref = isAdmin
    ? getLocalizedPath("/admin", locale)
    : getLocalizedPath("/", locale);
  const brandLabel = isAdmin ? t("nav.console") : "Pacergo";
  const labelFor = (key: string) =>
    isAdmin ? t(`nav.${key}`) : t(key);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur lg:flex">
      {/* pr-3 matches the footer wrapper so bell + gear share one right edge */}
      <div className="flex h-16 items-center justify-between gap-2 pl-6 pr-3">
        <Link
          href={brandHref}
          className="flex min-w-0 items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
              isAdmin
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "bg-primary text-primary-foreground",
            )}
          >
            {isAdmin ? "A" : "P"}
          </span>
          <span className="truncate text-lg">{brandLabel}</span>
        </Link>
        {!isAdmin && (
          <NotificationBell
            count={props.unreadCount ?? 0}
            className="h-7 w-7"
          />
        )}
      </div>

      <nav aria-label={menuLabel} className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.key}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50"
              >
                <Icon size={20} />
                {labelFor(item.key)}
                <SoonBadge className="ml-auto" />
              </div>
            );
          }

          const active = isItemActive(stripped, item.href);
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
              {labelFor(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {isAdmin ? (
          <>
            <Link
              href={getLocalizedPath("/", locale)}
              className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <ArrowLeft size={18} />
              {t("nav.backToApp")}
            </Link>
            <div className="flex items-center justify-end gap-1 px-1">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </>
        ) : props.user ? (
          <div className="flex items-center gap-3">
            <InitialAvatar
              name={props.user.display_name}
              src={props.user.photo_url}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <div className="flex h-7 items-center">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {props.user.display_name}
                </p>
                <SettingsSheet user={props.user} />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {props.user.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <SettingsSheet user={props.user} />
          </div>
        )}
      </div>
    </aside>
  );
}

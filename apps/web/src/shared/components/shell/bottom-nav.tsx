"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { NAV_ITEMS, ADMIN_NAV_ITEM, isNavItemActive } from "./nav-items";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/** Mobile/tablet bottom tab bar. Hidden on desktop (nav moves into the header). */
export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const { t } = useTranslation("nav");
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-around px-2 py-2">
        {items.map((item) => {
          const active = isNavItemActive(stripped, item.href);
          const href = getLocalizedPath(item.href, locale);
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <li key={item.key}>
                <div
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col items-center gap-1 px-2 py-1 opacity-50"
                >
                  <span className="relative">
                    <Icon size={22} className="text-muted-foreground" />
                    <SoonBadge className="absolute -right-3 -top-2 scale-90" />
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {t(item.key)}
                  </span>
                </div>
              </li>
            );
          }

          if (item.center) {
            return (
              <li key={item.key}>
                <Link
                  href={href}
                  className="-mt-7 flex flex-col items-center gap-1 transition-opacity hover:opacity-80"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <Icon size={22} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {t(item.key)}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.key}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 px-2 py-1 transition-opacity hover:opacity-80"
              >
                <Icon
                  size={22}
                  className={active ? "text-primary" : "text-muted-foreground"}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {t(item.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { SoonBadge } from "@/shared/components/atoms/soon-badge";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

type AppHeaderProps =
  | {
      variant?: "app";
      unreadCount?: number;
    }
  | {
      variant: "admin";
      unreadCount?: never;
    };

/** Sticky top bar: wordmark and notifications (settings lives in the bottom bar). */
export function AppHeader(props: AppHeaderProps) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const isAdmin = props.variant === "admin";
  const { t } = useTranslation(isAdmin ? "admin" : "nav");
  const onMessages =
    stripped === "/messages" || stripped.startsWith("/messages/");
  // The whole AI-plan flow — the hub ("Let's Get Started") and every
  // sub-wizard (About You / Training Preferences / Gym & Equipment) — has
  // its own title chrome (or, on the hub, its own big page heading), so it
  // skips the global bar on phone the same way Messages does above.
  const onAiPlanFlow = stripped === "/ai-plan" || stripped.startsWith("/ai-plan/");

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-1 px-2">
          {/* Out of the admin console, back to the app. Icon only; the label is its accessible name. */}
          <Link
            href={getLocalizedPath("/", locale)}
            aria-label={t("nav.backToApp")}
            title={t("nav.backToApp")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </Link>

          <Link
            href={getLocalizedPath("/admin", locale)}
            className="flex min-w-0 items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white dark:bg-emerald-500">
              A
            </span>
            <span className="truncate text-lg">{t("nav.console")}</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur",
        // Messages / the onboarding flow have their own title chrome; skip
        // the global bar on phone only.
        (onMessages || onAiPlanFlow) && "hidden md:block",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-4 px-4 lg:max-w-5xl lg:px-6">
        <Link
          href={getLocalizedPath("/", locale)}
          className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            P
          </span>
          <span className="text-lg">PacerGo — 陪練動</span>
        </Link>

        <nav className="hidden lg:flex lg:items-center lg:gap-1">
          {NAV_ITEMS.filter((item) => item.key !== "settings").map((item) => {
            if (item.comingSoon) {
              return (
                <span
                  key={item.key}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground/50"
                >
                  {t(item.key)}
                  <SoonBadge />
                </span>
              );
            }

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

        <NotificationBell count={props.unreadCount ?? 0} />
      </div>
    </header>
  );
}

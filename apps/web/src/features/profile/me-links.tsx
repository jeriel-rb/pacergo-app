"use client";

import Link from "next/link";
import {
  Star,
  CalendarClock,
  Dumbbell,
  Headset,
  ShieldCheck,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";

/** Account links shown at the top of the Settings sheet (Sessions, Saved,
 *  trainer backend, customer support, and — for platform admins — the review
 *  queue), one tap from any page instead of hidden behind Profile. The trainer
 *  entry reads "Become a trainer" until the user has a listing, then "Trainer
 *  Studio". Support and admin live here rather than in the bottom bar, keeping
 *  the bar at five centered tabs. */
export function MeLinks({
  isCompanion = false,
  isAdmin = false,
  onNavigate,
}: {
  isCompanion?: boolean;
  isAdmin?: boolean;
  /** Called when a link is followed (the sheet closes itself). */
  onNavigate?: () => void;
}) {
  const { t } = useTranslation("profile");
  const locale = useLocale();

  const links: { href: string; icon: LucideIcon; tint: string; label: string }[] = [
    {
      href: getLocalizedPath("/sessions", locale),
      icon: CalendarClock,
      tint: "text-primary",
      label: t("sessionsLink"),
    },
    {
      href: getLocalizedPath("/saved", locale),
      icon: Star,
      tint: "text-amber-500",
      label: t("savedLink"),
    },
    {
      href: getLocalizedPath("/studio", locale),
      icon: Dumbbell,
      tint: "text-primary",
      label: isCompanion ? t("studioLink") : t("becomeTrainerLink"),
    },
    {
      href: getLocalizedPath("/support", locale),
      icon: Headset,
      tint: "text-primary",
      label: t("supportLink"),
    },
    ...(isAdmin
      ? [
          {
            href: getLocalizedPath("/admin", locale),
            icon: ShieldCheck,
            tint: "text-emerald-600 dark:text-emerald-400",
            label: t("adminLink"),
          },
        ]
      : []),
  ];

  return (
    <ul className="space-y-1">
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className="flex h-12 items-center justify-between rounded-lg px-3 transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <Icon size={18} className={l.tint} />
                {l.label}
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

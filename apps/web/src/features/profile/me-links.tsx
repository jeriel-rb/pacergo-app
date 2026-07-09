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
import { Card } from "@/shared/components/ui/card";

/** Navigation links surfaced under the "Me" tab (Saved, Sessions, trainer
 *  backend, customer support, and — for platform admins — the review queue).
 *  The trainer entry reads "Become a trainer" until the user has a listing,
 *  then "Trainer Studio". Support and admin live here rather than in the
 *  bottom bar, keeping the bar at five centered tabs. */
export function MeLinks({
  isCompanion = false,
  isAdmin = false,
}: {
  isCompanion?: boolean;
  isAdmin?: boolean;
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
    <Card className="divide-y divide-border p-0">
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Icon size={18} className={l.tint} />
            </span>
            <span className="flex-1 text-sm font-medium">{l.label}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
        );
      })}
    </Card>
  );
}

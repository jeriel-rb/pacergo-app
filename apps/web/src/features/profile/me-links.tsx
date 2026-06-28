"use client";

import Link from "next/link";
import {
  Star,
  CalendarClock,
  Dumbbell,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { Card } from "@/shared/components/ui/card";

/** Navigation links surfaced under the "Me" tab (Saved, Sessions, trainer
 *  backend …). The trainer entry reads "Become a trainer" until the user has a
 *  listing, then "Trainer Studio". */
export function MeLinks({ isCompanion = false }: { isCompanion?: boolean }) {
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

"use client";

import Link from "next/link";
import { Star, ChevronRight, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { Card } from "@/shared/components/ui/card";

/** Navigation links surfaced under the "Me" tab (Saved, Sessions, trainer
 *  backend …). Extended as later phases land. */
export function MeLinks() {
  const { t } = useTranslation("profile");
  const locale = useLocale();

  const links: { href: string; icon: LucideIcon; tint: string; label: string }[] = [
    {
      href: getLocalizedPath("/saved", locale),
      icon: Star,
      tint: "text-amber-500",
      label: t("savedLink"),
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

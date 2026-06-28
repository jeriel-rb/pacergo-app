"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

/** Header bell linking to /notifications, with an unread badge. */
export function NotificationBell({ count = 0 }: { count?: number }) {
  const pathname = usePathname();
  const { t } = useTranslation("notifications");
  const href = getLocalizedPath("/notifications", getCurrentLocale(pathname));

  return (
    <Link
      href={href}
      aria-label={t("title")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute right-0.5 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

"use client";

import { useTranslation } from "react-i18next";
import type { UserProfile } from "@pacergo/shared";
import { cn } from "@/lib/utils";

type Role = "member" | "trainer" | "admin";

// A hue per role, solid enough to read against the bar in both themes (the
// page's muted grey made Member vanish, worst in dark mode).
const ROLE_STYLE: Record<Role, string> = {
  member:
    "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-100",
  trainer:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-100",
  admin:
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/70 dark:text-amber-100",
};

function RolePill({ role }: { role: Role }) {
  const { t } = useTranslation("nav");
  return (
    <span
      data-role={role}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-1.5 text-[11px] font-semibold leading-4",
        ROLE_STYLE[role],
      )}
    >
      {t(`role.${role}`)}
    </span>
  );
}

/**
 * Who is signed in, beside the bell: every account is exactly one of
 * Member / Trainer, and Admin is an extra permission shown on top of that.
 * Always one line; the sidebar width (w-80) and the phone title size leave
 * room for the longest pair, "Member" + "Admin".
 */
export function RoleBadges({
  user,
  className,
}: {
  user: Pick<UserProfile, "is_companion" | "is_admin"> | null;
  className?: string;
}) {
  if (!user) return null;

  return (
    <div className={cn("flex shrink-0 flex-nowrap items-center gap-1", className)}>
      <RolePill role={user.is_companion ? "trainer" : "member"} />
      {user.is_admin && <RolePill role="admin" />}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

export interface ShellNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  /** The emphasized center action in the bottom bar. */
  center?: boolean;
  /** Feature not built yet → rendered disabled with a "Soon" badge. */
  comingSoon?: boolean;
}

/** Whether `href` is the active route given the locale-stripped pathname. */
export function isRouteActive(strippedPath: string, href: string): boolean {
  if (href === "/") return strippedPath === "/";
  return strippedPath === href || strippedPath.startsWith(`${href}/`);
}

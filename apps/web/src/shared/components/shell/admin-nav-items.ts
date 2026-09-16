import { Download, ShieldCheck, Wallet } from "lucide-react";
import { isRouteActive, type ShellNavItem } from "./shell-nav-item";

export interface AdminNavItem extends ShellNavItem {
  /** Matches a key in the `admin.nav` i18n namespace. */
  key: "verifications" | "payouts" | "exports";
}

/** Default admin landing is trainer requests at `/admin`. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "verifications",
    href: "/admin",
    icon: ShieldCheck,
  },
  {
    key: "payouts",
    href: "/admin/payouts",
    icon: Wallet,
  },
  {
    key: "exports",
    href: "/admin/exports",
    icon: Download,
  },
];

/** Whether `href` is the active admin route given the locale-stripped pathname. */
export function isAdminNavItemActive(
  strippedPath: string,
  href: string,
): boolean {
  if (href === "/admin") {
    return (
      strippedPath === "/admin" ||
      strippedPath === "/admin/verifications" ||
      strippedPath.startsWith("/admin/verifications/")
    );
  }
  if (href === "/admin/payouts") {
    return strippedPath === "/admin/payouts" || strippedPath.startsWith("/admin/payouts/");
  }
  return isRouteActive(strippedPath, href);
}

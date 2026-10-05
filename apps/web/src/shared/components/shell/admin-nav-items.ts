import { Download, LayoutDashboard, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { isRouteActive, type ShellNavItem } from "./shell-nav-item";

export interface AdminNavItem extends ShellNavItem {
  /** Matches a key in the `admin.nav` i18n namespace. */
  key: "dashboard" | "verifications" | "orders" | "payouts" | "exports";
}

/** Default admin landing is the dashboard at `/admin`. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    key: "verifications",
    href: "/admin/verifications",
    icon: ShieldCheck,
  },
  {
    key: "orders",
    href: "/admin/orders",
    icon: Receipt,
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

/** The phone bottom bar: the same items, with the dashboard in the middle so it
 *  is the easiest to reach (the sidebar keeps it first). */
export function adminBottomNavItems(
  items: readonly AdminNavItem[] = ADMIN_NAV_ITEMS,
): AdminNavItem[] {
  const dashboard = items.find((i) => i.key === "dashboard");
  if (!dashboard) return [...items];
  const rest = items.filter((i) => i !== dashboard);
  const middle = Math.floor(items.length / 2);
  return [...rest.slice(0, middle), dashboard, ...rest.slice(middle)];
}

/** Whether `href` is the active admin route given the locale-stripped pathname. */
export function isAdminNavItemActive(
  strippedPath: string,
  href: string,
): boolean {
  if (href === "/admin") return strippedPath === "/admin";
  if (href === "/admin/verifications") {
    return (
      strippedPath === "/admin/verifications" ||
      strippedPath.startsWith("/admin/verifications/")
    );
  }
  if (href === "/admin/orders") {
    return strippedPath === "/admin/orders" || strippedPath.startsWith("/admin/orders/");
  }
  if (href === "/admin/payouts") {
    return strippedPath === "/admin/payouts" || strippedPath.startsWith("/admin/payouts/");
  }
  return isRouteActive(strippedPath, href);
}

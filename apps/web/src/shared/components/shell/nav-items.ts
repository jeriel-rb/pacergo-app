import {
  Home,
  Users,
  Dumbbell,
  MessageCircle,
  User,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Matches a key in the `nav` i18n namespace. */
  key: "home" | "community" | "trainers" | "messages" | "profile" | "admin";
  /** Unprefixed route (locale is applied at render time). */
  href: string;
  icon: LucideIcon;
  /** The emphasized center action in the bottom bar. */
  center?: boolean;
  /** Feature not built yet → rendered disabled with a "Soon" badge. */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "community", href: "/community", icon: Users, comingSoon: true },
  { key: "trainers", href: "/trainers", icon: Dumbbell, center: true },
  { key: "messages", href: "/messages", icon: MessageCircle },
  { key: "profile", href: "/profile", icon: User },
];

/** Appended to the nav only for platform admins (Tier A review queue). */
export const ADMIN_NAV_ITEM: NavItem = {
  key: "admin",
  href: "/admin",
  icon: ShieldCheck,
};

/** Whether `href` is the active route given the locale-stripped pathname. */
export function isNavItemActive(strippedPath: string, href: string): boolean {
  if (href === "/") return strippedPath === "/";
  return strippedPath === href || strippedPath.startsWith(`${href}/`);
}

import {
  Home,
  Users,
  Dumbbell,
  MessageCircle,
  Settings,
  ClipboardList,
  UserCog,
} from "lucide-react";
import { isRouteActive, type ShellNavItem } from "./shell-nav-item";

export interface NavItem extends ShellNavItem {
  /** Matches a key in the `nav` i18n namespace. */
  key: "home" | "community" | "trainers" | "messages" | "settings" | "myPlans" | "fitnessProfile";
  /** Opens SettingsSheet instead of navigating. */
  sheet?: "settings";
}

/**
 * The five primary tabs. Kept at an odd count so the raised center action
 * (`trainers`) sits at the true midpoint of the bottom bar. Settings opens
 * the sheet (profile + prefs) instead of a dedicated Me tab.
 *
 * `myPlans` and `fitnessProfile` are desktop-only (see `BottomNav`'s filter) —
 * the bottom bar's 5-icon/center-FAB layout wasn't designed for more slots.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "community", href: "/community", icon: Users, comingSoon: true },
  { key: "trainers", href: "/trainers", icon: Dumbbell, center: true },
  { key: "messages", href: "/messages", icon: MessageCircle },
  { key: "myPlans", href: "/ai-plan/my-plans", icon: ClipboardList },
  { key: "fitnessProfile", href: "/ai-plan/fitness-profile", icon: UserCog },
  { key: "settings", href: "/profile", icon: Settings, sheet: "settings" },
];

/** Whether `href` is the active route given the locale-stripped pathname. */
export function isNavItemActive(strippedPath: string, href: string): boolean {
  return isRouteActive(strippedPath, href);
}

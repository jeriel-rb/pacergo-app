import {
  Home,
  Dumbbell,
  MessageCircle,
  Settings,
  ClipboardList,
} from "lucide-react";
import { isRouteActive, type ShellNavItem } from "./shell-nav-item";

export interface NavItem extends ShellNavItem {
  /** Matches a key in the `nav` i18n namespace. */
  key: "home" | "trainers" | "messages" | "settings" | "myPlans";
  /** Opens SettingsSheet instead of navigating. */
  sheet?: "settings";
}

/**
 * The primary tabs. The mobile bottom bar shows all five, with `trainers`
 * as the raised center action (keep the count odd so it stays centered); `settings` opens the SettingsSheet instead
 * of navigating. Nutrition and Fitness Profile live in the home page's quick
 * actions. The desktop sidebar shows everything but `settings`, which
 * lives in its footer.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "myPlans", href: "/ai-plan/my-plans", icon: ClipboardList },
  { key: "trainers", href: "/trainers", icon: Dumbbell, center: true },
  { key: "messages", href: "/messages", icon: MessageCircle },
  { key: "settings", href: "/profile", icon: Settings, sheet: "settings" },
];

/** Whether `href` is the active route given the locale-stripped pathname. */
export function isNavItemActive(strippedPath: string, href: string): boolean {
  return isRouteActive(strippedPath, href);
}

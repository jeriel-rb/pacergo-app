import {
  Home,
  Dumbbell,
  MessageCircle,
  Settings,
  ClipboardList,
  UserCog,
  Apple,
} from "lucide-react";
import { isRouteActive, type ShellNavItem } from "./shell-nav-item";

export interface NavItem extends ShellNavItem {
  /** Matches a key in the `nav` i18n namespace. */
  key: "home" | "trainers" | "messages" | "settings" | "myPlans" | "nutrition" | "fitnessProfile";
  /** Opens SettingsSheet instead of navigating. */
  sheet?: "settings";
}

/**
 * The primary tabs. The mobile bottom bar shows all seven as equal-width
 * tabs (no raised center action); `settings` opens the SettingsSheet instead
 * of navigating. The desktop sidebar shows everything but `settings`, which
 * lives in its footer.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", icon: Home },
  { key: "myPlans", href: "/ai-plan/my-plans", icon: ClipboardList },
  { key: "trainers", href: "/trainers", icon: Dumbbell },
  { key: "messages", href: "/messages", icon: MessageCircle },
  { key: "nutrition", href: "/ai-plan/nutrition", icon: Apple },
  { key: "fitnessProfile", href: "/ai-plan/fitness-profile", icon: UserCog },
  { key: "settings", href: "/profile", icon: Settings, sheet: "settings" },
];

/** Whether `href` is the active route given the locale-stripped pathname. */
export function isNavItemActive(strippedPath: string, href: string): boolean {
  return isRouteActive(strippedPath, href);
}

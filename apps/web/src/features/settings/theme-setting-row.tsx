"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/shared/components/shell/theme-toggle";

/** Settings row for theme — the left icon reflects the current theme. */
export function ThemeSettingRow() {
  const { t } = useTranslation("settings");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Moon : Sun;

  return (
    <li className="flex h-12 items-center justify-between rounded-lg px-3">
      <span className="flex items-center gap-3 text-sm font-medium">
        <Icon size={18} className="text-muted-foreground" />
        {t("theme")}
      </span>
      <ThemeToggle />
    </li>
  );
}

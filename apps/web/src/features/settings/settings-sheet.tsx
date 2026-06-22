"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Globe,
  Bell,
  ShieldCheck,
  ChevronRight,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { UserProfile } from "@pacergo/shared";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { LanguageSwitcher } from "@/shared/components/shell/language-switcher";
import { ThemeSettingRow } from "./theme-setting-row";
import { Button } from "@/shared/components/ui/button";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Gear button → slide-in settings sheet (profile + settings list). */
export function SettingsSheet({ user }: { user: UserProfile | null }) {
  const { t } = useTranslation("settings");
  const pathname = usePathname();
  const router = useRouter();
  const locale = getCurrentLocale(pathname);
  const [open, setOpen] = useState(false);

  const profileHref = getLocalizedPath("/profile", locale);

  async function signOut() {
    setOpen(false);
    await createSupabaseBrowserClient().auth.signOut();
    router.push(getLocalizedPath("/sign-in", locale));
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("title")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings size={18} />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        {user && (
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b border-border p-5 transition-colors hover:bg-accent/60"
          >
            <InitialAvatar
              name={user.display_name}
              src={user.photo_url}
              size={52}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user.display_name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </Link>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            <ThemeSettingRow />
            <li className="flex h-12 items-center justify-between rounded-lg px-3">
              <span className="flex items-center gap-3 text-sm font-medium">
                <Globe size={18} className="text-muted-foreground" />
                {t("language")}
              </span>
              <LanguageSwitcher />
            </li>
            <SettingRow icon={Bell} label={t("notifications")} />
            <SettingRow icon={ShieldCheck} label={t("safety")} />
          </ul>
        </div>

        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-2 rounded-xl text-destructive hover:text-destructive"
          >
            <LogOut size={16} />
            {t("signOut")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li>
      <button
        type="button"
        className="flex h-12 w-full items-center justify-between rounded-lg px-3 transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-3 text-sm font-medium">
          <Icon size={18} className="text-muted-foreground" />
          {label}
        </span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>
    </li>
  );
}

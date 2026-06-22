"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EmailAuthForm } from "./email-auth-form";
import { ThemeToggle } from "@/shared/components/shell/theme-toggle";
import { LanguageSwitcher } from "@/shared/components/shell/language-switcher";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";

/** Sign-in / sign-up card. Same shell; mode swaps copy and the footer link. */
export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useTranslation("auth");
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const isSignIn = mode === "sign-in";

  const altHref = getLocalizedPath(
    isSignIn ? "/sign-up" : "/sign-in",
    locale,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center justify-end gap-1">
        <ThemeToggle />
        <LanguageSwitcher className="ml-1" />
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          P
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          {isSignIn ? t("signInTitle") : t("signUpTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignIn ? t("signInSubtitle") : t("signUpSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <EmailAuthForm mode={mode} />
      </div>

      <p className="mx-auto mt-6 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        {t("terms")}
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignIn ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={altHref} className="font-semibold text-primary">
          {isSignIn ? t("signUpLink") : t("signInLink")}
        </Link>
      </p>
    </div>
  );
}

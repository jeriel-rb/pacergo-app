"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";

/** App-wide 404 for the [locale] segment (styled, localized). */
export default function NotFound() {
  const { t } = useTranslation("common");
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Compass className="size-7 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("notFound.body")}
      </p>
      <Link
        href={getLocalizedPath("/", locale)}
        className={buttonVariants({ className: "mt-2" })}
      >
        {t("notFound.home")}
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";

/** App-wide error boundary for the [locale] segment (styled, localized). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation("common");
  const locale = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="size-7 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold">{t("errorBoundary.title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("errorBoundary.body")}
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={reset}>
          {t("retry")}
        </Button>
        <Link
          href={getLocalizedPath("/", locale)}
          className={buttonVariants()}
        >
          {t("errorBoundary.home")}
        </Link>
      </div>
    </div>
  );
}

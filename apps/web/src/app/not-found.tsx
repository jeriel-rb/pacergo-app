import Link from "next/link";
import { cookies } from "next/headers";
import { Compass } from "lucide-react";
import zh from "@/locales/zh/common.json";
import en from "@/locales/en/common.json";
import { LOCALE_COOKIE_NAME } from "@/i18nConfig";
import { buttonVariants } from "@/shared/components/ui/button";

/**
 * Unmatched URLs are rendered by the root layout, which is only a fragment
 * (`<html>` / `<body>` live on the locale layout). This page has to supply
 * those tags itself, and it cannot use the locale i18n provider.
 */
export default async function NotFound() {
  const locale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value === "en" ? "en" : "zh";
  const copy = locale === "en" ? en.notFound : zh.notFound;

  return (
    <html lang={locale === "en" ? "en" : "zh-Hant-TW"}>
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Compass className="size-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{copy.body}</p>
          <Link href="/" className={buttonVariants({ className: "mt-2" })}>
            {copy.home}
          </Link>
        </div>
      </body>
    </html>
  );
}

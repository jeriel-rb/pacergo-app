"use client";

import { Mail, MessageSquare, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL, supportMailto } from "@pacergo/shared";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

/** Customer-support contact page (linked from the "Me" tab). Provides a
 *  reachable support channel — required for App Store review. */
export function SupportView() {
  const { t } = useTranslation("support");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Mail size={20} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold">{t("emailTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emailDesc")}</p>
            <a
              href={supportMailto(t("mailSubject"))}
              className="inline-block break-all text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>

        <a href={supportMailto(t("mailSubject"))} className="block">
          <Button type="button" className="w-full gap-2">
            <MessageSquare size={16} />
            {t("contactCta")}
          </Button>
        </a>

        <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Clock size={14} className="mt-0.5 shrink-0" />
          <span>{t("hours")}</span>
        </div>
      </Card>
    </div>
  );
}

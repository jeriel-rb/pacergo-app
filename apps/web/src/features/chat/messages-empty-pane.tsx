"use client";

import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Right-pane placeholder when no conversation is selected (desktop). */
export function MessagesEmptyPane() {
  const { t } = useTranslation("chat");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/40">
        <MessageCircle size={28} className="text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{t("title")}</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("selectConversation")}
        </p>
      </div>
    </div>
  );
}

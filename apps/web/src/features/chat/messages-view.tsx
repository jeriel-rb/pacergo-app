"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConversationSummary } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/** Inbox — the user's conversations (each gated behind a prior booking). */
export function MessagesView({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const { t } = useTranslation("chat");
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
      </header>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <MessageCircle size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={getLocalizedPath(
                `/messages/${c.id}`,
                getCurrentLocale(pathname),
              )}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-accent"
            >
              <InitialAvatar
                name={c.other_name ?? "—"}
                src={c.other_photo}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">
                    {c.other_name ?? "—"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(c.last_message_at, locale)}
                  </span>
                </div>
                <p
                  className={cn(
                    "truncate text-sm",
                    c.unread > 0
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {c.last_body ?? t("noMessages")}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string, locale: "zh" | "en"): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConversationSummary } from "@pacergo/shared";
import { formatInAppTimeZone } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { useLocale } from "@/shared/hooks/use-locale";
import {
  getCurrentLocale,
  getLocalizedPath,
  pathWithoutLeadingLocale,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

/**
 * Full-screen Instagram DM layout: list left, thread right.
 * No inset card / rounded wrapper — flush under the app chrome beside the sidebar.
 */
export function MessagesInboxShell({
  conversations,
  children,
}: {
  conversations: ConversationSummary[];
  children: React.ReactNode;
}) {
  const { t } = useTranslation("chat");
  const pathname = usePathname();
  const locale = useLocale();
  const routeLocale = getCurrentLocale(pathname);
  const stripped = pathWithoutLeadingLocale(pathname);
  const selectedId = stripped.match(/^\/messages\/([^/]+)/)?.[1] ?? null;
  const showingThread = Boolean(selectedId);

  return (
    <>
      {/* Reserve flow space so the fixed pane doesn't collapse the main column. */}
      <div
        aria-hidden
        className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-7.5rem)] lg:h-dvh"
      />
      <div
        className={cn(
          "fixed z-20 flex bg-background",
          // Phone: no AppHeader on this route — flush under status area, above tabs.
          // Tablet: still under AppHeader (top-14). Desktop: full pane beside sidebar.
          "inset-x-0 top-0 bottom-16 md:top-14",
          "lg:inset-y-0 lg:left-64 lg:right-0 lg:top-0 lg:bottom-0",
        )}
      >
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-border bg-background lg:w-80 lg:border-r xl:w-96",
            showingThread ? "hidden lg:flex" : "flex",
          )}
        >
          <header className="shrink-0 border-b border-border px-4 py-4">
            <h1 className="text-xl font-bold">{t("title")}</h1>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <MessageCircle size={28} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              </div>
            ) : (
              <ul className="py-1">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <Link
                        href={getLocalizedPath(`/messages/${c.id}`, routeLocale)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors",
                          active ? "bg-accent" : "hover:bg-accent/60",
                        )}
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
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            "min-w-0 flex-1 flex-col bg-background",
            showingThread ? "flex" : "hidden lg:flex",
          )}
        >
          {children}
        </section>
      </div>
    </>
  );
}

function formatTime(iso: string, locale: "zh" | "en"): string {
  return formatInAppTimeZone(iso, locale, {
    month: "short",
    day: "numeric",
  });
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Expand, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  ChatMessage,
  ConversationHeader,
  ConversationSummary,
} from "@pacergo/shared";
import { formatInAppTimeZone } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { useLocale } from "@/shared/hooks/use-locale";
import {
  fetchConversationHeader,
  fetchConversationMessages,
  fetchMyConversations,
  startConversation,
} from "./chat-actions";
import { useChatDock } from "./chat-dock-context";
import { ChatThread } from "./chat-thread";

/**
 * Instagram/Facebook-style corner chat:
 * FAB → conversation list → click row → thread in the same overlay.
 * Maximize opens the full /messages page (sidebar stays).
 */
export function ChatDock() {
  const { t } = useTranslation("chat");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const {
    open,
    view,
    thread,
    currentUserId,
    openConversation,
    backToInbox,
    closeChat,
  } = useChatDock();

  const [inboxLoading, setInboxLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    [],
  );

  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [header, setHeader] = useState<ConversationHeader | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load inbox whenever the list view is shown.
  useEffect(() => {
    if (!open || view !== "inbox") return;
    let cancelled = false;
    async function load() {
      setInboxLoading(true);
      try {
        const rows = await fetchMyConversations();
        if (!cancelled) setConversations(rows);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setInboxLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, view]);

  // Load thread when a target is selected.
  useEffect(() => {
    if (!open || view !== "thread" || !thread) {
      setHeader(null);
      setMessages([]);
      setThreadError(null);
      setThreadLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setThreadLoading(true);
      setThreadError(null);
      try {
        const conversationId =
          thread!.kind === "conversation"
            ? thread!.conversationId
            : await startConversation(thread!.otherId);

        const [nextHeader, nextMessages] = await Promise.all([
          fetchConversationHeader(conversationId),
          fetchConversationMessages(conversationId),
        ]);
        if (cancelled) return;
        if (!nextHeader) {
          setThreadError(t("dock.loadError"));
          setHeader(null);
          setMessages([]);
          return;
        }
        setHeader(nextHeader);
        setMessages(nextMessages);
      } catch {
        if (!cancelled) {
          setThreadError(t("dock.loadError"));
          setHeader(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, view, thread, t]);

  if (!open) return null;

  const unreadTotal = conversations.reduce((n, c) => n + (c.unread ?? 0), 0);

  function maximize() {
    const href =
      view === "thread" && header
        ? getLocalizedPath(`/messages/${header.id}`, getCurrentLocale(pathname))
        : getLocalizedPath("/messages", getCurrentLocale(pathname));
    closeChat();
    router.push(href);
  }

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl",
        "inset-x-2 bottom-2 top-24 rounded-2xl",
        "sm:inset-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(560px,calc(100dvh-6rem))] sm:w-[380px]",
        "lg:bottom-6 lg:right-6",
      )}
    >
      {view === "inbox" ? (
        <>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-bold">{t("title")}</h2>
              {unreadTotal > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={maximize}
                aria-label={t("dock.maximize")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Expand size={16} />
              </button>
              <button
                type="button"
                onClick={closeChat}
                aria-label={t("dock.close")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {inboxLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                {t("dock.loading")}
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/60"
                    >
                      <InitialAvatar
                        name={c.other_name ?? "—"}
                        src={c.other_photo}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {c.other_name ?? "—"}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatTime(c.last_message_at, locale)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "truncate text-xs",
                            c.unread > 0
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {c.last_body ?? t("noMessages")}
                        </p>
                      </div>
                      {c.unread > 0 && (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={backToInbox}
                aria-label={t("back")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft size={20} />
              </button>
              {header ? (
                <>
                  <InitialAvatar
                    name={header.other_name ?? "—"}
                    src={header.other_photo}
                    size={32}
                  />
                  <p className="truncate text-sm font-semibold">
                    {header.other_name ?? "—"}
                  </p>
                </>
              ) : (
                <p className="truncate text-sm font-semibold">{t("title")}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={maximize}
                disabled={!header}
                aria-label={t("dock.maximize")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Expand size={16} />
              </button>
              <button
                type="button"
                onClick={closeChat}
                aria-label={t("dock.close")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {threadLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {t("dock.loading")}
            </div>
          ) : threadError ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-destructive">
              {threadError}
            </div>
          ) : header ? (
            <ChatThread
              key={header.id}
              header={header}
              initialMessages={messages}
              currentUserId={currentUserId}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function formatTime(iso: string, locale: "zh" | "en"): string {
  return formatInAppTimeZone(iso, locale, {
    month: "short",
    day: "numeric",
  });
}

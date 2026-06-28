"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChatMessage, ConversationHeader } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { sendMessage, markConversationRead } from "./chat-actions";

/** A single conversation thread with a composer and realtime updates. */
export function ConversationView({
  header,
  initialMessages,
  currentUserId,
}: {
  header: ConversationHeader;
  initialMessages: ChatMessage[];
  currentUserId: string | null;
}) {
  const { t } = useTranslation("chat");
  const pathname = usePathname();
  const convId = header.id;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Mark read + subscribe to incoming messages (messages is in the realtime pub).
  useEffect(() => {
    markConversationRead(convId);
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`conv:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      const id = await sendMessage(convId, body);
      setMessages((prev) =>
        prev.some((x) => x.id === id)
          ? prev
          : [
              ...prev,
              {
                id,
                sender_id: currentUserId ?? "",
                body,
                created_at: new Date().toISOString(),
              },
            ],
      );
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  const backHref = getLocalizedPath("/messages", getCurrentLocale(pathname));

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col lg:h-[calc(100dvh-7rem)]">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <Link
          href={backHref}
          aria-label={t("back")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft size={20} />
        </Link>
        <InitialAvatar
          name={header.other_name ?? "—"}
          src={header.other_photo}
          size={36}
        />
        <span className="truncate font-semibold">{header.other_name ?? "—"}</span>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("threadEmpty")}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <span
                className={cn(
                  "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.body}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSend}
        className="flex items-center gap-2 border-t border-border pt-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("composer.placeholder")}
          maxLength={4000}
          className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label={t("send")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

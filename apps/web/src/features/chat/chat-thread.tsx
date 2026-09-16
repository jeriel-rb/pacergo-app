"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChatMessage, ConversationHeader } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { sendMessage, markConversationRead } from "./chat-actions";

/** Shared message list + composer (page thread and floating dock). */
export function ChatThread({
  header,
  initialMessages,
  currentUserId,
  className,
}: {
  header: ConversationHeader;
  initialMessages: ChatMessage[];
  currentUserId: string | null;
  className?: string;
}) {
  const { t } = useTranslation("chat");
  const convId = header.id;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, convId]);

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

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
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
        className="flex items-center gap-2 px-3 py-3"
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

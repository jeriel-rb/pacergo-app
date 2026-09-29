"use client";

import { useEffect, useRef, useState } from "react";
import { Send, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChatMessage, ConversationHeader } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { sendMessage, markConversationRead } from "./chat-actions";

type PendingMessage = ChatMessage & { status?: "sending" | "failed" };

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

  const [messages, setMessages] = useState<PendingMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
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
    if (!body) return;
    setDraft("");
    await attemptSend(`pending-${Date.now()}-${Math.random().toString(36).slice(2)}`, body);
  }

  async function attemptSend(tempId: string, body: string) {
    setMessages((prev) => {
      const existing = prev.find((m) => m.id === tempId);
      if (existing) {
        return prev.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m));
      }
      return [
        ...prev,
        {
          id: tempId,
          sender_id: currentUserId ?? "",
          body,
          created_at: new Date().toISOString(),
          status: "sending",
        },
      ];
    });
    try {
      const id = await sendMessage(convId, body);
      setMessages((prev) =>
        prev.some((x) => x.id === id && x.id !== tempId)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) =>
              m.id === tempId ? { ...m, id, status: undefined } : m,
            ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    }
  }

  function retry(m: PendingMessage) {
    void attemptSend(m.id, m.body);
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
              className={cn("flex flex-col", mine ? "items-end" : "items-start")}
            >
              <span
                className={cn(
                  "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                  m.status === "sending" && "opacity-60",
                  m.status === "failed" && "opacity-80",
                )}
              >
                {m.body}
              </span>
              {m.status === "failed" && (
                <button
                  type="button"
                  onClick={() => retry(m)}
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <TriangleAlert size={12} />
                  {t("sendFailed")} · {t("retry")}
                </button>
              )}
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
          disabled={!draft.trim()}
          aria-label={t("send")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

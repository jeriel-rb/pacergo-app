"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ConversationSummary } from "@pacergo/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pathWithoutLeadingLocale } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { useChatDockOptional } from "./chat-dock-context";

/**
 * Instagram-style floating Messages pill (bottom-right).
 * Opens the conversation-list overlay (not the full page).
 */
export function MessagesFab() {
  const { t } = useTranslation("chat");
  const pathname = usePathname();
  const dock = useChatDockOptional();
  const [unread, setUnread] = useState(0);

  const stripped = pathWithoutLeadingLocale(pathname);
  const onMessages =
    stripped === "/messages" || stripped.startsWith("/messages/");
  // Trainer detail already has a Message CTA beside the name.
  const onTrainerDetail = /^\/trainers\/[^/]+\/?$/.test(stripped);
  const dockOpen = Boolean(dock?.open);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.rpc("my_conversations");
        if (cancelled) return;
        const rows = (data ?? []) as ConversationSummary[];
        setUnread(rows.reduce((n, c) => n + (c.unread ?? 0), 0));
      } catch {
        if (!cancelled) setUnread(0);
      }
    }
    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname, dockOpen]);

  if (onMessages || onTrainerDetail || dockOpen || !dock) return null;

  return (
    <button
      type="button"
      onClick={() => dock.openInbox()}
      className={cn(
        // Mobile already has Messages in the bottom bar — show FAB from tablet up.
        "fixed z-40 hidden items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg transition-colors hover:bg-accent md:flex",
        "bottom-20 right-4 lg:bottom-6 lg:right-6",
      )}
    >
      <span className="relative inline-flex">
        <MessageCircle size={20} className="text-foreground" />
        {unread > 0 && (
          <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <span className="text-sm font-semibold">{t("title")}</span>
    </button>
  );
}

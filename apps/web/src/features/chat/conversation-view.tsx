"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChatMessage, ConversationHeader } from "@pacergo/shared";
import { InitialAvatar } from "@/shared/components/atoms/initial-avatar";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { ChatThread } from "./chat-thread";

/** Conversation thread — embeds in the messages split pane (or full on mobile). */
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
  const backHref = getLocalizedPath("/messages", getCurrentLocale(pathname));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3">
        {/* Back only on mobile — desktop keeps the list visible beside the thread. */}
        <Link
          href={backHref}
          aria-label={t("back")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
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

      <ChatThread
        header={header}
        initialMessages={initialMessages}
        currentUserId={currentUserId}
        className="min-h-0"
      />
    </div>
  );
}

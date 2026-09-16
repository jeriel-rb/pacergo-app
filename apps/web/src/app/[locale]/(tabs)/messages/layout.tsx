import { getMyConversations } from "@/lib/chat";
import { MessagesInboxShell } from "@/features/chat/messages-inbox-shell";

export const dynamic = "force-dynamic";

/** Shared Instagram-style split shell for /messages and /messages/[id]. */
export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const conversations = await getMyConversations();
  return (
    <MessagesInboxShell conversations={conversations}>
      {children}
    </MessagesInboxShell>
  );
}

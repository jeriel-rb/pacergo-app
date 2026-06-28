import { getMyConversations } from "@/lib/chat";
import { MessagesView } from "@/features/chat/messages-view";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const conversations = await getMyConversations();
  return <MessagesView conversations={conversations} />;
}

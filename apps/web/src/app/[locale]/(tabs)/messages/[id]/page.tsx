import { notFound } from "next/navigation";
import {
  getConversationHeader,
  getConversationMessages,
} from "@/lib/chat";
import { getSessionUser } from "@/lib/auth";
import { ConversationView } from "@/features/chat/conversation-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: Params) {
  const { id } = await params;
  const [header, messages, user] = await Promise.all([
    getConversationHeader(id),
    getConversationMessages(id),
    getSessionUser(),
  ]);
  if (!header) notFound();
  return (
    <ConversationView
      header={header}
      initialMessages={messages}
      currentUserId={user?.id ?? null}
    />
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChatDockThread =
  | { kind: "other"; otherId: string }
  | { kind: "conversation"; conversationId: string };

type ChatDockView = "inbox" | "thread";

type ChatDockContextValue = {
  open: boolean;
  view: ChatDockView;
  thread: ChatDockThread | null;
  currentUserId: string | null;
  /** FAB: open the conversation list overlay. */
  openInbox: () => void;
  /** Trainer/booking Message CTA: open a thread (skip inbox). */
  openChatWithUser: (otherId: string) => void;
  openConversation: (conversationId: string) => void;
  /** From thread overlay back to the list. */
  backToInbox: () => void;
  closeChat: () => void;
};

const ChatDockContext = createContext<ChatDockContextValue | null>(null);

/** Global Instagram/Facebook-style floating chat dock state. */
export function ChatDockProvider({
  currentUserId,
  children,
}: {
  currentUserId: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatDockView>("inbox");
  const [thread, setThread] = useState<ChatDockThread | null>(null);

  const openInbox = useCallback(() => {
    setView("inbox");
    setThread(null);
    setOpen(true);
  }, []);

  const openChatWithUser = useCallback((otherId: string) => {
    setThread({ kind: "other", otherId });
    setView("thread");
    setOpen(true);
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    setThread({ kind: "conversation", conversationId });
    setView("thread");
    setOpen(true);
  }, []);

  const backToInbox = useCallback(() => {
    setView("inbox");
    setThread(null);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    setView("inbox");
    setThread(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      view,
      thread,
      currentUserId,
      openInbox,
      openChatWithUser,
      openConversation,
      backToInbox,
      closeChat,
    }),
    [
      open,
      view,
      thread,
      currentUserId,
      openInbox,
      openChatWithUser,
      openConversation,
      backToInbox,
      closeChat,
    ],
  );

  return (
    <ChatDockContext.Provider value={value}>{children}</ChatDockContext.Provider>
  );
}

export function useChatDock(): ChatDockContextValue {
  const ctx = useContext(ChatDockContext);
  if (!ctx) {
    throw new Error("useChatDock must be used within ChatDockProvider");
  }
  return ctx;
}

/** Safe hook when Message may render outside the dock provider. */
export function useChatDockOptional(): ChatDockContextValue | null {
  return useContext(ChatDockContext);
}

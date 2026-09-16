"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatDockOptional } from "./chat-dock-context";

/** Opens the floating chat dock with another user (booking-gated entry). */
export function MessageButton({
  otherId,
  variant = "outline",
  size = "default",
  className,
}: {
  otherId: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const { t } = useTranslation("chat");
  const dock = useChatDockOptional();
  const [loading, setLoading] = useState(false);

  async function open() {
    if (!dock) return;
    setLoading(true);
    try {
      dock.openChatWithUser(otherId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={open}
      disabled={loading || !dock}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <MessageCircle size={16} />
      )}
      {t("messageButton")}
    </Button>
  );
}

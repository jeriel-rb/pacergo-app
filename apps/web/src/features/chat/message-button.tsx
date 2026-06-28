"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { useLocale } from "@/shared/hooks/use-locale";
import { getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { startConversation } from "./chat-actions";

/** Opens (or creates) a conversation with another user. Only render when a
 *  booking exists between them — messaging is gated on a booking. */
export function MessageButton({
  otherId,
  variant = "outline",
  className,
}: {
  otherId: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const { t } = useTranslation("chat");
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const id = await startConversation(otherId);
      router.push(getLocalizedPath(`/messages/${id}`, locale));
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      onClick={open}
      disabled={loading}
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

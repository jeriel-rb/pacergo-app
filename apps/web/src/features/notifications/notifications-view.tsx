"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACTIVITY_META, NOTIFICATION_PAGE_SIZE, formatInAppTimeZone, type ActivitySlug } from "@pacergo/shared";
import type { AppNotification } from "@/lib/notifications";
import { useLocale } from "@/shared/hooks/use-locale";
import { getCurrentLocale, getLocalizedPath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { fetchNotificationPage, markNotificationsRead } from "./notification-actions";

/** Notifications list. Marks everything read on view. */
export function NotificationsView({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const { t } = useTranslation("notifications");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [rejected, setRejected] = useState<AppNotification | null>(null);
  const [more, setMore] = useState<AppNotification[]>([]);
  const [hasMore, setHasMore] = useState(notifications.length === NOTIFICATION_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const items = [...notifications, ...more];

  const hasUnread = items.some((n) => !n.read_at);

  // A booking request is inserted by the database trigger. Subscribe only to
  // this signed-in user's rows so the page updates immediately without a
  // browser reload and never receives another user's notifications.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let disposed = false;

    async function subscribe() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || disposed) return;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => router.refresh(),
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (hasUnread) {
      markNotificationsRead().then(() => router.refresh());
    }
  }, [hasUnread, router]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await fetchNotificationPage(items.length);
      setMore((current) => [...current, ...next]);
      setHasMore(next.length === NOTIFICATION_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">{t("title")}</h1>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Bell size={28} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const bookingId = n.payload?.booking_id;
            const href = bookingId
              ? getLocalizedPath(
                  `/sessions/${bookingId}`,
                  getCurrentLocale(pathname),
                )
              : null;

            // A rejected trainer request opens a dialog with the reviewer's reason.
            const opensReason = n.type === "verification_rejected";

            const body = (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border p-3.5 transition-colors",
                  n.read_at ? "bg-card" : "bg-primary/5",
                  (href || opensReason) && "hover:bg-accent",
                )}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Bell size={16} className="text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {t([`type.${n.type}`, "type.default"])}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatTime(n.created_at, locale)}
                  </p>
                </div>
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            );

            if (opensReason) {
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setRejected(n)}
                  className="block w-full text-left"
                >
                  {body}
                </button>
              );
            }

            return href ? (
              <Link key={n.id} href={href} className="block">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          {loadingMore ? t("loadingMore") : t("loadMore")}
        </button>
      )}

      <Dialog open={rejected !== null} onOpenChange={(open) => !open && setRejected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejection.title")}</DialogTitle>
            <DialogDescription>
              {[
                rejected?.payload.activity
                  ? (ACTIVITY_META[rejected.payload.activity as ActivitySlug]?.[locale] ??
                    rejected.payload.activity)
                  : null,
                rejected?.payload.label,
              ]
                .filter(Boolean)
                .join(" · ")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("rejection.reason")}</p>
            <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
              {rejected?.payload.notes || t("rejection.noReason")}
            </p>
            <p className="text-xs text-muted-foreground">{t("rejection.hint")}</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setRejected(null)}>
              {t("rejection.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTime(iso: string, locale: "zh" | "en"): string {
  return formatInAppTimeZone(iso, locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

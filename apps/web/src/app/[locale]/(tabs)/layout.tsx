import { AppShell } from "@/shared/components/shell/app-shell";
import { AppHeader } from "@/shared/components/shell/app-header";
import { BottomNav } from "@/shared/components/shell/bottom-nav";
import { SideNav } from "@/shared/components/shell/side-nav";
import { ChatDockProvider } from "@/features/chat/chat-dock-context";
import { ChatDock } from "@/features/chat/chat-dock";
import { MessagesFab } from "@/features/chat/messages-fab";
import { getSessionUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, unreadCount] = await Promise.all([
    getSessionUser(),
    getUnreadNotificationCount(),
  ]);
  return (
    <ChatDockProvider currentUserId={user?.id ?? null}>
      <AppShell
        sideNav={<SideNav user={user} unreadCount={unreadCount} />}
        header={
          <div className="lg:hidden">
            <AppHeader unreadCount={unreadCount} />
          </div>
        }
        bottomNav={<BottomNav user={user} />}
      >
        {children}
      </AppShell>
      <ChatDock />
      <MessagesFab />
    </ChatDockProvider>
  );
}

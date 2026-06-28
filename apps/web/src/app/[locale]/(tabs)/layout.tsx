import { AppHeader } from "@/shared/components/shell/app-header";
import { BottomNav } from "@/shared/components/shell/bottom-nav";
import { SideNav } from "@/shared/components/shell/side-nav";
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
    <div className="min-h-screen lg:pl-64">
      {/* Desktop: persistent sidebar. Mobile: top header + bottom tab bar. */}
      <SideNav user={user} unreadCount={unreadCount} />
      <div className="lg:hidden">
        <AppHeader user={user} unreadCount={unreadCount} />
      </div>
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

import { AppHeader } from "@/shared/components/shell/app-header";
import { BottomNav } from "@/shared/components/shell/bottom-nav";
import { getSessionUser } from "@/lib/auth";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4 lg:max-w-5xl lg:px-6 lg:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

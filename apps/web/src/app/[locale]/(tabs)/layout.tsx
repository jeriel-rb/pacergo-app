import { AppHeader } from "@/shared/components/shell/app-header";
import { BottomNav } from "@/shared/components/shell/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4 lg:max-w-5xl lg:px-6 lg:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

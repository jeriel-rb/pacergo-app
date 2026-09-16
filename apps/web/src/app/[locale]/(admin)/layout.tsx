import { notFound } from "next/navigation";
import { AppShell } from "@/shared/components/shell/app-shell";
import { AppHeader } from "@/shared/components/shell/app-header";
import { BottomNav } from "@/shared/components/shell/bottom-nav";
import { SideNav } from "@/shared/components/shell/side-nav";
import { getIsAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) notFound();

  return (
    <AppShell
      sideNav={<SideNav variant="admin" />}
      header={
        <div className="lg:hidden">
          <AppHeader variant="admin" />
        </div>
      }
      bottomNav={<BottomNav variant="admin" />}
      mainClassName="mx-auto w-full max-w-md px-4 pb-28 pt-4 lg:max-w-4xl lg:px-10 lg:pb-16 lg:pt-10"
    >
      {children}
    </AppShell>
  );
}

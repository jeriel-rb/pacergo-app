/** Shared responsive shell: sidebar + optional header + main + optional bottom nav. */
export function AppShell({
  sideNav,
  header,
  bottomNav,
  children,
  mainClassName = "mx-auto w-full max-w-md px-4 pb-28 pt-4 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-10",
}: {
  sideNav: React.ReactNode;
  header?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="min-h-screen lg:pl-64">
      {sideNav}
      {header}
      <main className={mainClassName}>{children}</main>
      {bottomNav}
    </div>
  );
}

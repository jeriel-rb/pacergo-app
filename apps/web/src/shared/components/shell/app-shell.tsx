/**
 * Space between a page's sections: the same as main's side padding (px-4 /
 * lg:px-10 below), so gaps and gutters line up. Change both together.
 */
export const PAGE_GAP = "gap-4 lg:gap-10";

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
    <div className="min-h-screen lg:pl-80">
      {sideNav}
      {header}
      <main className={mainClassName}>{children}</main>
      {bottomNav}
    </div>
  );
}

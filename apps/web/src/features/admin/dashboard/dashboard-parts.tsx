import { Card } from "@/shared/components/ui/card";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A dashboard panel: title + description on top (optional action on the
 *  right), then the content. Used for the users table and the side cards. */
export function DashboardCard({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex min-h-0 flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground lg:[@media(max-height:800px)]:hidden">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Centered "nothing here" text that fills a card's body. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-40 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Bordered, rounded frame around a table; the table scrolls inside it. */
export function TableFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border", className)}>
      {children}
    </div>
  );
}

/** A single full-width row for "nothing here" / error messages. */
export function MessageRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

/** Placeholder rows while a table's data is loading. */
export function SkeletonRows({
  columns,
  rows = 5,
  rowClassName,
}: {
  columns: number;
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className={cn("hover:bg-transparent", rowClassName)}>
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Whole-number formatting that doesn't depend on the server / browser locale. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** "NT$1,200" */
export function ntd(amount: number): string {
  return `NT$${formatCount(amount)}`;
}

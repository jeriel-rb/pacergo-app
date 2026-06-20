import { cn } from "@/lib/utils";
import { Card } from "@/shared/components/ui/card";

/** A titled white card used for the detail-page sections and home modules. */
export function SectionCard({
  icon,
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  icon?: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      {(title || icon || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            {title && <h2 className="text-base font-semibold">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

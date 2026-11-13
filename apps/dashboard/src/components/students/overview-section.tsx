import { cn } from "@school-clerk/ui/cn";
import type { ReactNode } from "react";

/** A flat page section: heading row, optional action, content. No card chrome. */
export function OverviewSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 py-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {action ? <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

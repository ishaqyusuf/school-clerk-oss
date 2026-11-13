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

export type OverviewDetail = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
  className?: string;
};

/** Label/value pairs: two columns in the sheet, four when there is room. */
export function OverviewDetails({
  details,
  size = "default",
  columns = 4,
  className,
}: {
  details: OverviewDetail[];
  size?: "default" | "lg";
  /** 4: two columns, four when wide. 3: always one row; hints show once there is room. */
  columns?: 3 | 4;
  className?: string;
}) {
  const compact = columns === 3;
  return (
    <div className={cn("@container py-5", className)}>
      <dl
        className={cn(
          "grid gap-y-4",
          compact ? "grid-cols-3 gap-x-4" : "grid-cols-2 gap-x-6 @2xl:grid-cols-4",
        )}
      >
        {details.map((detail) => (
          <div key={detail.label} className="min-w-0 space-y-1">
            <dt className="text-xs text-muted-foreground">{detail.label}</dt>
            <dd
              className={cn(
                "break-words font-medium text-foreground",
                size === "lg" && "tabular-nums tracking-tight",
                size === "lg" ? (compact ? "text-base @md:text-xl" : "text-xl") : "text-sm",
                detail.mono && "font-mono",
                detail.className,
              )}
            >
              <bdi>{detail.value}</bdi>
            </dd>
            {detail.hint ? (
              <dd className={cn("text-xs text-muted-foreground", compact && "hidden @md:block")}>{detail.hint}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A slim progress line for paid or attended ratios. */
export function OverviewMeter({
  value,
  label,
  className,
  tone = "primary",
}: {
  value: number;
  label: string;
  className?: string;
  tone?: "primary" | "success" | "muted";
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          tone === "success" && "bg-status-success-fg",
          tone === "primary" && "bg-primary",
          tone === "muted" && "bg-muted-foreground/40",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

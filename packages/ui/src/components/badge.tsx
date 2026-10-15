import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.03em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        tag: "font-mono text-muted-foreground bg-muted text-[10px] border-none font-normal rounded-none",
        success:
          "border-status-success-border bg-status-success-bg text-status-success-fg",
        warning:
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        info: "border-status-info-border bg-status-info-bg text-status-info-fg",
        neutral:
          "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

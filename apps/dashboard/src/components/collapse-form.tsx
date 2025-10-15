import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@school-clerk/ui/collapsible";

interface Props {
  label?;
  children;
  asChild?: boolean;
  className?: string;
  btnClassName?: string;
  Trigger?;
}
export function CollapseForm({
  label,
  children,
  className,
  asChild,
  btnClassName,
  Trigger,
}: Props) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild={asChild} className={cn("w-full", className)}>
        {Trigger ? (
          Trigger
        ) : (
          <Button
            asChild={!asChild}
            className={cn("w-full", btnClassName)}
            size="xs"
            variant="secondary"
            type="button"
          >
            {label}
          </Button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

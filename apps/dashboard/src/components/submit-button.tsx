import { Loader2 } from "lucide-react";

// import { cn } from "../utils";
import { Button, type ButtonProps } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";

export function SubmitButton({
  children,
  isSubmitting,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  isSubmitting: boolean;
  disabled?: boolean;
} & ButtonProps) {
  return (
    <Button
      disabled={isSubmitting || disabled}
      {...props}
      className={cn(props.className, "relative")}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center gap-2",
          isSubmitting && "opacity-0",
        )}
      >
        {children}
      </span>

      {isSubmitting && (
        <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      )}
    </Button>
  );
}

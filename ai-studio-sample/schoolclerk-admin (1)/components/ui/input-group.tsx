
import * as React from "react"
import { cn } from "./utils"

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center rounded-lg border border-border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden",
          "[&>input]:flex-1 [&>input]:!border-0 [&>input]:!focus-visible:ring-0 [&>input]:!focus-visible:ring-offset-0 [&>input]:!shadow-none [&>input]:!rounded-none [&>input]:h-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
InputGroup.displayName = "InputGroup"

const InputGroupText = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full items-center bg-muted/50 px-3 text-sm text-muted-foreground border-r border-border last:border-r-0 last:border-l",
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupText.displayName = "InputGroupText"

export { InputGroup, InputGroupText }

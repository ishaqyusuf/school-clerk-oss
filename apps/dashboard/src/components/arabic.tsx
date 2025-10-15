import { arabic } from "@/fonts";
import { cn } from "@school-clerk/ui/cn";

interface Props {
  className?: string;
  children?;
}
export function Arabic(props: Props) {
  return (
    <div className={cn(arabic.className, props.className)}>
      {props.children}
    </div>
  );
}

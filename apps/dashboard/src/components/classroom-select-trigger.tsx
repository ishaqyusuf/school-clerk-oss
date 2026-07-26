import { SelectTrigger } from "@school-clerk/ui/select";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export function ClassroomSelectTrigger({
	children,
	...props
}: Omit<
	ComponentPropsWithoutRef<typeof SelectTrigger>,
	"hideIcon" | "noIcon"
>) {
	return (
		<SelectTrigger hideIcon noIcon {...props}>
			<span className="inline-flex min-w-0 items-center gap-2">
				{children}
				<ChevronDown
					aria-hidden="true"
					className="h-4 w-4 shrink-0 text-muted-foreground"
				/>
			</span>
		</SelectTrigger>
	);
}

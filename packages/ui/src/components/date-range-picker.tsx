"use client";

import { useIsMobile } from "../hooks/use-mobile";
import type { DateRange } from "react-day-picker";
import { cn } from "../utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Icons } from "@school-clerk/ui/custom/icons";
import { CalendarPopover } from "./calendar-popover";

type Props = {
	range: DateRange;
	className?: string;
	onSelect: (range?: DateRange) => void;
	placeholder: string;
	disabled?: boolean;
};

export function DateRangePicker({
	className,
	range,
	disabled,
	onSelect,
	placeholder,
}: Props) {
	const mobile = useIsMobile();
	return (
		<div className={cn("grid gap-2", className)}>
			<CalendarPopover
				title={placeholder || "Choose date range"}
				align="end"
				trigger={
					<Button
						type="button"
						disabled={disabled}
						variant="outline"
						className={cn("justify-start text-left font-medium gap-2")}
					>
						<span>{placeholder}</span>
						<Icons.chevronDown />
					</Button>
				}
			>
				<Calendar
					initialFocus
					mode="range"
					defaultMonth={range?.from}
					selected={range}
					onSelect={onSelect}
					numberOfMonths={mobile ? 1 : 2}
				/>
			</CalendarPopover>
		</div>
	);
}

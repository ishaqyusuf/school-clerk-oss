"use client";
import { daysFilters } from "@school-clerk/utils/constants";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Calendar } from "../../calendar";
import {
	dateFilterValueToSelection,
	dateRangeSelectionToFilterValue,
	normalizeDateFilterValue,
} from "./date-filter-model";

type DateRangeFilterProps = {
	value: unknown;
	onChange: (value: string[] | null) => void;
	mobile?: boolean;
};

export function DateRangeFilter({
	value,
	onChange,
	mobile,
}: DateRangeFilterProps) {
	const normalizedValue = normalizeDateFilterValue(value);
	const activePreset =
		normalizedValue.length === 1 &&
		daysFilters.includes(normalizedValue[0] as (typeof daysFilters)[number])
			? normalizedValue[0]
			: null;

	return (
		<div className={cn("flex max-w-full flex-col", !mobile && "sm:flex-row")}>
			<div
				className={cn(
					"grid grid-cols-2 gap-1 border-b p-2",
					!mobile && "min-w-40 sm:grid-cols-1 sm:border-r sm:border-b-0",
				)}
			>
				{daysFilters.map((preset) => (
					<Button
						key={preset}
						aria-pressed={activePreset === preset}
						type="button"
						variant="ghost"
						size="sm"
						className={cn(
							"justify-start capitalize",
							mobile && "min-h-11 h-auto whitespace-normal",
							activePreset === preset && "bg-accent font-medium",
						)}
						onClick={() => onChange([preset])}
					>
						{preset}
					</Button>
				))}
			</div>
			<Calendar
				mode="range"
				initialFocus={!mobile}
				selected={dateFilterValueToSelection(value)}
				onSelect={(range) => onChange(dateRangeSelectionToFilterValue(range))}
			/>
		</div>
	);
}

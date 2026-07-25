"use client";

import { useDataSkeleton } from "@/hooks/use-data-skeleton";
import { Button } from "@school-clerk/ui/button";
import { Calendar } from "@school-clerk/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { format, startOfDay } from "date-fns";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
} from "react-hook-form";
import { cn } from "../../utils";
import { Field } from "../composite";

interface FormDateProps {
	label?: string;
	placeholder?: string;
	className?: string;
	size?: "sm" | "default" | "xs";
	dateFormat?: string;
	description?: string;
	clearable?: boolean;
	showToday?: boolean;
	calendarProps?: Omit<
		ComponentProps<typeof Calendar>,
		"mode" | "selected" | "onSelect" | "required"
	>;
}

export function FormDate<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	label,
	placeholder,
	className,
	size = "default",
	dateFormat = "PPP",
	calendarProps,
	description,
	clearable = false,
	showToday = false,
	...props
}: Partial<ControllerProps<TFieldValues, TName>> & FormDateProps) {
	const load = useDataSkeleton();
	const [open, setOpen] = useState(false);
	const fieldId = useId();
	const minimumMonth = new Date(1900, 0, 1);
	const maximumMonth = new Date(new Date().getFullYear() + 20, 11, 1);

	return (
		<Controller
			{...(props as ControllerProps<TFieldValues, TName>)}
			render={({ field, fieldState }) => (
				<Field
					data-invalid={fieldState.invalid}
					className={cn(
						"flex min-w-0 flex-col",
						className,
						props.disabled && "text-muted-foreground",
					)}
				>
					{label ? (
						<Field.Label htmlFor={fieldId}>{label}</Field.Label>
					) : null}
					{load?.loading ? (
						<Skeleton className="h-9 w-full" />
					) : (
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger asChild>
								<Button
									id={fieldId}
									type="button"
									variant="outline"
									aria-invalid={fieldState.invalid}
									aria-label={label ?? placeholder ?? "Choose date"}
									disabled={field.disabled || props.disabled}
									className={cn(
										"w-full justify-between gap-3 px-3 text-left font-normal",
										!field.value && "text-muted-foreground",
										size === "sm" && "h-8",
										size === "xs" && "h-7 text-xs",
									)}
								>
									<span className="truncate">
										{field.value
											? format(field.value, dateFormat)
											: placeholder || "Pick a date"}
									</span>
									<CalendarIcon
										aria-hidden="true"
										className="size-4 shrink-0 opacity-60"
									/>
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-auto overflow-hidden p-0"
								align="start"
								sideOffset={6}
							>
								<Calendar
									{...calendarProps}
									mode="single"
									selected={field.value ?? undefined}
									captionLayout={calendarProps?.captionLayout ?? "dropdown"}
									startMonth={calendarProps?.startMonth ?? minimumMonth}
									endMonth={calendarProps?.endMonth ?? maximumMonth}
									autoFocus
									onSelect={(date) => {
										if (!date) return;
										field.onChange(date);
										setOpen(false);
									}}
								/>
								{clearable || showToday ? (
									<div className="flex items-center justify-between gap-2 border-t p-2">
										{clearable ? (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												disabled={!field.value}
												onClick={() => {
													field.onChange(null);
													setOpen(false);
												}}
											>
												<RotateCcw data-icon="inline-start" />
												Clear date
											</Button>
										) : (
											<span />
										)}
										{showToday ? (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => {
													field.onChange(startOfDay(new Date()));
													setOpen(false);
												}}
											>
												Today
											</Button>
										) : null}
									</div>
								) : null}
							</PopoverContent>
						</Popover>
					)}
					{description ? (
						<Field.Description>{description}</Field.Description>
					) : null}
					{fieldState.error ? (
						<Field.Error errors={[fieldState.error]} />
					) : null}
				</Field>
			)}
		/>
	);
}

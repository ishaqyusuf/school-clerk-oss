"use client";

import * as React from "react";
import { format } from "date-fns";
import { useIsMobile } from "../hooks/use-mobile";
import { Calendar } from "./calendar";
import { CalendarPopover } from "./calendar-popover";

function parseDate(value: unknown) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return undefined;
	const date = new Date(`${value}T12:00:00`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Retains native input/form semantics while replacing the phone's date picker. */
export const CalendarInput = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>(({ onChange, onClick, onKeyDown, ...props }, forwardedRef) => {
	const mobile = useIsMobile();
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const [open, setOpen] = React.useState(false);
	const [localValue, setLocalValue] = React.useState(props.defaultValue ?? "");
	const selected = parseDate(props.value ?? localValue);
	const minimum = parseDate(props.min);
	const maximum = parseDate(props.max);
	const canOpen = mobile && !props.disabled && !props.readOnly;

	const input = (
		<input
			{...props}
			type="date"
			ref={(node) => {
				inputRef.current = node;
				if (typeof forwardedRef === "function") forwardedRef(node);
				else if (forwardedRef) forwardedRef.current = node;
			}}
			onChange={(event) => {
				setLocalValue(event.currentTarget.value);
				onChange?.(event);
			}}
			onClick={(event) => {
				onClick?.(event);
				if (canOpen && !event.defaultPrevented) {
					event.preventDefault();
					setOpen(true);
				}
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (
					canOpen &&
					!event.defaultPrevented &&
					(event.key === "Enter" || event.key === " ")
				) {
					event.preventDefault();
					setOpen(true);
				}
			}}
		/>
	);
	if (!mobile) return input;

	return (
		<CalendarPopover
			open={open}
			onOpenChange={setOpen}
			title={props["aria-label"] || "Choose date"}
			trigger={input}
		>
			<Calendar
				mode="single"
				selected={selected}
				defaultMonth={selected}
				captionLayout="dropdown"
				startMonth={minimum ?? new Date(1900, 0)}
				endMonth={maximum ?? new Date(new Date().getFullYear() + 20, 11)}
				disabled={[
					...(minimum ? [{ before: minimum }] : []),
					...(maximum ? [{ after: maximum }] : []),
				]}
				onSelect={(date) => {
					const node = inputRef.current;
					if (!date || !node || props.disabled || props.readOnly) return;
					const next = format(date, "yyyy-MM-dd");
					// Use the native setter so React receives a normal input change,
					// retaining controlled values, react-hook-form and form submission.
					const setter = Object.getOwnPropertyDescriptor(
						HTMLInputElement.prototype,
						"value",
					)?.set;
					setter?.call(node, next);
					node.dispatchEvent(new Event("input", { bubbles: true }));
					node.dispatchEvent(new Event("change", { bubbles: true }));
					setLocalValue(next);
					setOpen(false);
				}}
			/>
		</CalendarPopover>
	);
});
CalendarInput.displayName = "CalendarInput";

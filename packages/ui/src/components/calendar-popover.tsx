"use client";

import { type ReactElement, type ReactNode, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Button } from "./button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/** Shared calendar presentation: bottom sheet on phones, popover on desktop. */
export function CalendarPopover({
	children,
	trigger,
	title = "Choose date",
	description = "",
	open: controlledOpen,
	onOpenChange,
	align = "start",
	modal = false,
}: {
	children: ReactNode;
	trigger: ReactElement;
	title?: string;
	description?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	align?: "start" | "center" | "end";
	modal?: boolean;
}) {
	const mobile = useIsMobile();
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = (next: boolean) => {
		setInternalOpen(next);
		onOpenChange?.(next);
	};

	if (mobile) {
		return (
			<Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
				<DrawerTrigger asChild>{trigger}</DrawerTrigger>
				<DrawerContent className="max-h-[90dvh] pb-[env(safe-area-inset-bottom)]">
					<DrawerHeader className="gap-1 px-4 pb-1 pt-3 text-left">
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription className={description ? undefined : "sr-only"}>
							{description || "Select a date from the calendar."}
						</DrawerDescription>
					</DrawerHeader>
					<div
						className="min-h-0 overflow-y-auto overscroll-contain px-4"
						data-vaul-no-drag
					>
						<div className="mx-auto w-fit max-w-full">{children}</div>
					</div>
					<DrawerFooter className="px-4 pb-3 pt-2">
						<DrawerClose asChild>
							<Button type="button" variant="outline" className="h-11">
								Cancel
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Popover modal={modal} open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{trigger}</PopoverTrigger>
			<PopoverContent
				align={align}
				sideOffset={6}
				className="w-auto overflow-hidden p-0"
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}

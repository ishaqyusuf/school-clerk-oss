"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { X } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	type ReactNode,
	type RefObject,
	createContext,
	useContext,
	useRef,
} from "react";
import { cn } from "../../utils";
import { Button } from "../button";
import {
	Sheet,
	SheetClose,
	SheetDescription,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
} from "../sheet";

/**
 * Phone bottom sheet listing a page's actions. Shares the mobile filter sheet's
 * layering (above the dev URL widget), grab handle, 44px targets, safe-area
 * padding and reduced-motion treatment. Desktop keeps its dropdown menus.
 */
export type MobileActionSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description?: string;
	/** Receives focus again when the sheet closes without running an action. */
	triggerRef?: RefObject<HTMLButtonElement | null>;
	children: ReactNode;
};

type PendingAction = { current: (() => void) | null };

const ActionSheetContext = createContext<{
	pending: PendingAction;
	close: () => void;
} | null>(null);

export function MobileActionSheet({
	open,
	onOpenChange,
	title = "Actions",
	description,
	triggerRef,
	children,
}: MobileActionSheetProps) {
	// Actions run after the sheet has closed, so dialogs they open do not have
	// to compete with this sheet's focus trap and scroll lock.
	const pending = useRef<(() => void) | null>(null);
	const closeRef = useRef<HTMLButtonElement>(null);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPortal>
				<SheetOverlay className="z-[100] motion-reduce:animate-none motion-reduce:transition-none" />
				<DialogPrimitive.Content
					data-mobile-action-sheet=""
					{...(description ? {} : { "aria-describedby": undefined })}
					className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl border-t bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none motion-reduce:transition-none"
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						closeRef.current?.focus();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						const action = pending.current;
						pending.current = null;
						if (action) action();
						else triggerRef?.current?.focus();
					}}
				>
					<header className="shrink-0 px-4 pt-3 pb-2">
						<div
							aria-hidden="true"
							className="mx-auto mb-2 h-1 w-8 rounded-full bg-muted-foreground/40"
						/>
						<div className="flex items-center justify-between gap-3">
							<SheetTitle>{title}</SheetTitle>
							<SheetClose asChild>
								<Button
									ref={closeRef}
									type="button"
									variant="ghost"
									size="icon"
									className="size-11"
									aria-label={`Close ${title.toLowerCase()}`}
								>
									<X className="size-5" />
								</Button>
							</SheetClose>
						</div>
						{description ? (
							<SheetDescription>{description}</SheetDescription>
						) : null}
					</header>
					<ActionSheetContext.Provider
						value={{ pending, close: () => onOpenChange(false) }}
					>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
							<div className="grid gap-0.5">{children}</div>
						</div>
					</ActionSheetContext.Provider>
				</DialogPrimitive.Content>
			</SheetPortal>
		</Sheet>
	);
}

export type MobileActionSheetItemProps = Omit<
	ComponentPropsWithoutRef<"button">,
	"onSelect"
> & {
	icon?: ReactNode;
	description?: ReactNode;
	/** Runs after the sheet closes. */
	onSelect?: () => void;
	/** Render the child (for example a link) as the row. */
	asChild?: boolean;
};

export function MobileActionSheetItem({
	icon,
	description,
	onSelect,
	asChild,
	className,
	children,
	onClick,
	disabled,
	...props
}: MobileActionSheetItemProps) {
	const context = useContext(ActionSheetContext);
	const Comp = asChild ? Slot : "button";
	const content = asChild ? (
		children
	) : (
		<>
			{icon ? <ItemIcon>{icon}</ItemIcon> : null}
			<span className="min-w-0 flex-1">
				<span className="block truncate">{children}</span>
				{description ? (
					<span className="block text-xs text-muted-foreground">
						{description}
					</span>
				) : null}
			</span>
		</>
	);

	return (
		<Comp
			{...(asChild ? {} : { type: "button" as const, disabled })}
			aria-disabled={asChild && disabled ? true : undefined}
			className={cn(
				"flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-start text-sm font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
				className,
			)}
			onClick={(event) => {
				onClick?.(event as never);
				if (event.defaultPrevented || disabled) return;
				if (context) {
					context.pending.current = onSelect ?? null;
					context.close();
				} else {
					onSelect?.();
				}
			}}
			{...props}
		>
			{content}
		</Comp>
	);
}

function ItemIcon({ children }: { children: ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className="flex size-5 items-center justify-center"
		>
			{children}
		</span>
	);
}

export function MobileActionSheetSeparator() {
	return <hr className="mx-3 my-1 border-border" />;
}

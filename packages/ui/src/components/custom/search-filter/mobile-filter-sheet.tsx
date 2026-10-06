"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Filter, X } from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { useIsMobile } from "../../../hooks/use-mobile";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../../accordion";
import { Button } from "../../button";
import { Checkbox } from "../../checkbox";
import { DropdownMenuTrigger } from "../../dropdown-menu";
import { Input } from "../../input";
import { RadioGroup, RadioGroupItem } from "../../radio-group";
import {
	Sheet,
	SheetClose,
	SheetDescription,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
} from "../../sheet";
import {
	type FilterValues,
	type MobileFilterGroup,
	type MobileFilterOption,
	filterGroupSummary,
	filterSheetPatch,
	resetFilterDraft,
	selectFilterOption,
} from "./mobile-filter-model";

export type {
	FilterValues,
	MobileFilterGroup,
	MobileFilterOption,
} from "./mobile-filter-model";

export type MobileFilterSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	values: FilterValues;
	groups: MobileFilterGroup[];
	onApply: (patch: FilterValues) => unknown | Promise<unknown>;
	triggerRef?: RefObject<HTMLButtonElement | null>;
	title?: string;
	loading?: boolean;
	error?: string;
	onRetry?: () => void;
	resolveGroups?: (draft: FilterValues) => MobileFilterGroup[];
	onSelectOption?: (
		draft: FilterValues,
		group: MobileFilterGroup,
		option: MobileFilterOption,
	) => FilterValues | null;
	renderGroup?: (
		group: MobileFilterGroup,
		value: unknown,
		update: (patch: FilterValues) => void,
		draft: FilterValues,
	) => ReactNode;
	summary?: (group: MobileFilterGroup, value: unknown) => string;
};

export function FilterMenuTrigger({
	mobile,
	children,
}: { mobile: boolean; children: ReactNode }) {
	return mobile ? (
		children
	) : (
		<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
	);
}

export function MobileFilterSheet(props: MobileFilterSheetProps) {
	// A fresh editing session on every open, including dismissal after Reset.
	return props.open ? <FilterDraftSession {...props} /> : null;
}

function FilterDraftSession({
	open,
	onOpenChange,
	values,
	groups,
	onApply,
	triggerRef,
	title = "Filters",
	loading,
	error,
	onRetry,
	resolveGroups,
	onSelectOption,
	renderGroup,
	summary,
}: MobileFilterSheetProps) {
	const [draft, setDraft] = useState<FilterValues>(() =>
		structuredClone(values),
	);
	const [expanded, setExpanded] = useState(groups[0]?.key ?? "");
	const [applying, setApplying] = useState(false);
	const [applyError, setApplyError] = useState<string>();
	const closeRef = useRef<HTMLButtonElement>(null);
	const descriptionId = useId();
	const resolvedGroups = resolveGroups?.(draft) ?? groups;
	const update = (patch: FilterValues) =>
		setDraft((current) => ({ ...current, ...patch }));

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!applying) onOpenChange(next);
			}}
		>
			<FilterSheetContent
				aria-describedby={descriptionId}
				className="flex max-h-[88dvh] min-h-72 flex-col gap-0 overflow-hidden rounded-t-2xl p-0 motion-reduce:animate-none motion-reduce:transition-none"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					closeRef.current?.focus();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					triggerRef?.current?.focus();
				}}
				onEscapeKeyDown={(event) => event.stopPropagation()}
			>
				<header className="shrink-0 px-4 pt-3 pb-4">
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
								aria-label="Close filters"
								disabled={applying}
							>
								<X className="size-5" />
							</Button>
						</SheetClose>
					</div>
					<SheetDescription id={descriptionId}>
						Choose filters, then apply your changes.
					</SheetDescription>
				</header>
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
					{loading && (
						<output className="block py-3 text-sm text-muted-foreground">
							Loading filters…
						</output>
					)}
					{error && (
						<div role="alert" className="py-3 text-sm text-destructive">
							{error}
							{onRetry && (
								<Button
									type="button"
									variant="outline"
									className="mt-2 min-h-11"
									onClick={onRetry}
								>
									Retry
								</Button>
							)}
						</div>
					)}
					{!loading && !error && !resolvedGroups.length && (
						<p className="py-3 text-sm text-muted-foreground">
							No filters available.
						</p>
					)}
					<Accordion
						type="single"
						collapsible
						value={expanded}
						onValueChange={setExpanded}
					>
						{resolvedGroups.map((group) => (
							<AccordionItem key={group.key} value={group.key}>
								<AccordionTrigger className="min-h-16 gap-3 text-left motion-reduce:transition-none [&>svg]:motion-reduce:transition-none">
									<span className="min-w-0 flex-1">
										<span className="block text-sm">{group.label}</span>
										<span className="mt-1 block break-words text-xs font-normal text-muted-foreground">
											{summary?.(group, draft[group.key]) ??
												filterGroupSummary(group, draft[group.key])}
										</span>
									</span>
								</AccordionTrigger>
								<AccordionContent className="motion-reduce:animate-none motion-reduce:transition-none">
									{renderGroup?.(group, draft[group.key], update, draft) ?? (
										<FilterChoices
											group={group}
											value={draft[group.key]}
											disabled={applying}
											onSelect={(option) =>
												update(
													onSelectOption?.(draft, group, option) ??
														selectFilterOption(draft, group, option),
												)
											}
										/>
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
				<footer className="shrink-0 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
					{applyError && (
						<p role="alert" className="mb-2 text-sm text-destructive">
							{applyError}
						</p>
					)}
					<div className="flex gap-3">
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							disabled={applying}
							onClick={() => {
								setDraft(resetFilterDraft(draft, groups));
								setApplyError(undefined);
							}}
						>
							Reset
						</Button>
						<Button
							type="button"
							className="min-h-11 flex-1"
							disabled={applying || loading || Boolean(error)}
							onClick={async () => {
								setApplying(true);
								setApplyError(undefined);
								try {
									await onApply(filterSheetPatch(draft, groups));
									onOpenChange(false);
								} catch {
									setApplyError("Could not apply filters. Try again.");
									setApplying(false);
								}
							}}
						>
							{applying ? "Applying…" : "Apply filters"}
						</Button>
					</div>
				</footer>
			</FilterSheetContent>
		</Sheet>
	);
}

function FilterSheetContent({
	children,
	...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
	return (
		<SheetPortal>
			<SheetOverlay className="z-[100] motion-reduce:animate-none motion-reduce:transition-none" />
			<DialogPrimitive.Content
				{...props}
				data-mobile-filter-sheet=""
				className={`fixed inset-x-0 bottom-0 z-[101] border-t bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none motion-reduce:transition-none ${props.className ?? ""}`}
			>
				{children}
			</DialogPrimitive.Content>
		</SheetPortal>
	);
}

export function FilterChoices({
	group,
	value,
	onSelect,
	disabled,
}: {
	group: MobileFilterGroup;
	value: unknown;
	onSelect: (option: MobileFilterOption) => void;
	disabled?: boolean;
}) {
	const [query, setQuery] = useState("");
	const id = useId();
	const options = group.options ?? [];
	const visible = options.filter((option) =>
		`${option.label} ${option.subLabel ?? ""}`
			.toLowerCase()
			.includes(query.toLowerCase()),
	);
	const choices = visible.map((option, index) => {
		const optionId = `${id}-${index}`;
		const checked = Array.isArray(value)
			? value.includes(option.value)
			: value === option.value;
		return (
			<label
				key={option.value}
				htmlFor={optionId}
				className={`flex min-h-11 cursor-pointer items-center gap-3 break-words rounded-md border px-3 py-2 text-sm ${checked ? "border-primary bg-accent" : "border-border"}`}
			>
				{group.multiple ? (
					<Checkbox
						id={optionId}
						checked={checked}
						disabled={disabled}
						onCheckedChange={() => onSelect(option)}
					/>
				) : (
					<RadioGroupItem
						id={optionId}
						value={option.value}
						disabled={disabled}
					/>
				)}
				<span className="min-w-0 flex-1" dir="auto">
					{option.label}
					{option.subLabel && (
						<span className="block text-xs text-muted-foreground">
							{option.subLabel}
						</span>
					)}
				</span>
			</label>
		);
	});
	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="ghost"
				className="min-h-11 w-full justify-start text-muted-foreground"
				disabled={disabled}
				onClick={() => onSelect({ value: "", label: "All" })}
			>
				Clear {group.label.toLowerCase()}
			</Button>
			{options.length > 20 && (
				<Input
					aria-label={`Search ${group.label} options`}
					placeholder={`Search ${group.label.toLowerCase()}…`}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			)}
			{group.loading ? (
				<output>Loading options…</output>
			) : group.error ? (
				<p role="alert">{group.error}</p>
			) : !visible.length ? (
				<p className="py-2 text-sm text-muted-foreground">
					{query ? "No matching options." : "No options available."}
				</p>
			) : group.multiple ? (
				<div className="grid gap-2">{choices}</div>
			) : (
				<RadioGroup
					aria-label={group.label}
					value={typeof value === "string" ? value : ""}
					onValueChange={(next) => {
						const option = options.find((option) => option.value === next);
						if (option) onSelect(option);
					}}
				>
					{choices}
				</RadioGroup>
			)}
		</div>
	);
}

export function MobileFilterButton(
	props: Omit<MobileFilterSheetProps, "open" | "onOpenChange" | "triggerRef">,
) {
	const mobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!mobile) setOpen(false);
	}, [mobile]);
	return mobile ? (
		<>
			<Button
				ref={triggerRef}
				type="button"
				variant="outline"
				className="min-h-11 gap-2"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => setOpen(true)}
			>
				<Filter className="size-4" />
				Filters
			</Button>
			<MobileFilterSheet
				{...props}
				open={open}
				onOpenChange={setOpen}
				triggerRef={triggerRef}
			/>
		</>
	) : null;
}

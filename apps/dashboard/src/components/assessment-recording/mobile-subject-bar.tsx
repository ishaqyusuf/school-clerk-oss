"use client";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { ChevronDown, Layers, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	ProgressRing,
	type SubjectRailItem,
	progressLabel,
} from "./subject-rail";

/**
 * Height of the phone subject bar. The score table header sticks directly
 * below it, so keep `MOBILE_SUBJECT_BAR_OFFSET` in sync with this height.
 */
export const MOBILE_SUBJECT_BAR_HEIGHT = "h-14";
export const MOBILE_SUBJECT_BAR_OFFSET = "top-14";

type Props = {
	/** The selected subject when exactly one is shown. */
	subject: SubjectRailItem | null;
	selectedCount: number;
	search: string;
	onSearchChange: (search: string) => void;
	/** Opens the subject picker; the trigger receives focus when it closes. */
	onOpenSubjects: (trigger: HTMLButtonElement) => void;
};

/**
 * Phone-only sticky bar: one subject switcher plus a search toggle that swaps
 * the switcher for an inline search field in the same row and height.
 */
export function MobileSubjectBar({
	subject,
	selectedCount,
	search,
	onSearchChange,
	onOpenSubjects,
}: Props) {
	const [searchOpen, setSearchOpen] = useState(false);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const restoreFocus = useRef(false);
	const showSearch = searchOpen || search !== "";

	useEffect(() => {
		if (showSearch || !restoreFocus.current) return;
		restoreFocus.current = false;
		searchButtonRef.current?.focus();
	}, [showSearch]);

	const closeSearch = () => {
		restoreFocus.current = true;
		onSearchChange("");
		setSearchOpen(false);
	};

	const title = subject
		? subject.title
		: `${selectedCount} subject${selectedCount === 1 ? "" : "s"}`;

	return (
		<div
			className={`sticky top-0 z-40 -mx-2 flex ${MOBILE_SUBJECT_BAR_HEIGHT} items-center gap-1.5 border-b bg-background px-2 sm:mx-0 sm:px-0 md:hidden`}
		>
			{showSearch ? (
				<>
					<div className="relative min-w-0 flex-1">
						<Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={search}
							onChange={(event) => onSearchChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Escape") closeSearch();
							}}
							placeholder="Search student"
							aria-label="Search student name"
							className="h-11 ps-9 text-base"
						/>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-11 shrink-0"
						aria-label="Close search"
						onClick={closeSearch}
					>
						<X className="size-5" />
					</Button>
				</>
			) : (
				<>
					<button
						type="button"
						aria-haspopup="dialog"
						aria-label={
							subject
								? `Subject: ${subject.title}, ${progressLabel(subject)}. Change subject`
								: `${title}. Change subject`
						}
						onClick={(event) => onOpenSubjects(event.currentTarget)}
						className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border px-3 text-start text-sm transition-colors hover:bg-accent motion-reduce:transition-none"
					>
						{subject ? (
							<ProgressRing
								completed={subject.completed}
								total={subject.total}
								size={18}
							/>
						) : (
							<Layers className="size-4 shrink-0 text-muted-foreground" />
						)}
						<span className="min-w-0 truncate font-semibold" dir="auto">
							{title}
						</span>
						{subject ? (
							<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
								{subject.hasAssessments
									? `${subject.completed}/${subject.total}`
									: "–"}
							</span>
						) : null}
						<ChevronDown className="ms-auto size-4 shrink-0 text-muted-foreground" />
					</button>
					<Button
						ref={searchButtonRef}
						type="button"
						variant="ghost"
						size="icon"
						className="size-11 shrink-0"
						aria-label="Search students"
						onClick={() => setSearchOpen(true)}
					>
						<Search className="size-5" />
					</Button>
				</>
			)}
		</div>
	);
}

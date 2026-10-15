"use client";

import { cn } from "@school-clerk/ui/cn";
import { Switch } from "@school-clerk/ui/switch";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

export type SubjectRailItem = {
	id: string;
	title: string;
	completed: number;
	total: number;
	hasAssessments: boolean;
};

type Props = {
	subjects: SubjectRailItem[];
	selectedIds: string[];
	multiple: boolean;
	onSelect: (subjectId: string) => void;
	onMultipleChange?: (multiple: boolean) => void;
};

function ProgressRing({
	completed,
	total,
	size = 20,
}: {
	completed: number;
	total: number;
	size?: number;
}) {
	const radius = (size - 4) / 2;
	const circumference = 2 * Math.PI * radius;
	const ratio = total ? Math.min(completed / total, 1) : 0;

	return (
		<svg
			aria-hidden="true"
			className="shrink-0 -rotate-90"
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			width={size}
		>
			<circle
				className="stroke-border"
				cx={size / 2}
				cy={size / 2}
				fill="none"
				r={radius}
				strokeWidth={3}
			/>
			<circle
				className={ratio >= 1 ? "stroke-green-600" : "stroke-primary"}
				cx={size / 2}
				cy={size / 2}
				fill="none"
				r={radius}
				strokeDasharray={`${circumference * ratio} ${circumference}`}
				strokeLinecap="round"
				strokeWidth={3}
			/>
		</svg>
	);
}

function progressLabel(subject: SubjectRailItem) {
	return subject.hasAssessments
		? `${subject.completed}/${subject.total}`
		: "No columns";
}

/** Desktop rail: one row per subject with live completion. */
export function SubjectRail({
	subjects,
	selectedIds,
	multiple,
	onSelect,
	onMultipleChange,
}: Props) {
	return (
		<nav aria-label="Subjects" className="grid gap-0.5">
			<p className="mx-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
				Subjects
			</p>
			{subjects.map((subject) => {
				const selected = selectedIds.includes(subject.id);
				return (
					<button
						key={subject.id}
						type="button"
						onClick={() => onSelect(subject.id)}
						aria-current={!multiple && selected ? "true" : undefined}
						aria-pressed={multiple ? selected : undefined}
						className={cn(
							"grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm transition-colors hover:bg-muted",
							selected &&
								!multiple &&
								"bg-accent font-semibold text-accent-foreground hover:bg-accent",
						)}
					>
						{multiple ? (
							<span
								aria-hidden="true"
								className={cn(
									"mx-auto flex size-4 items-center justify-center rounded-[4px] border border-primary",
									selected && "bg-primary text-primary-foreground",
								)}
							>
								{selected ? <Check className="size-3" /> : null}
							</span>
						) : (
							<ProgressRing
								completed={subject.completed}
								total={subject.total}
							/>
						)}
						<span className="truncate" dir="auto">
							{subject.title}
						</span>
						<span className="text-xs font-normal tabular-nums text-muted-foreground">
							{progressLabel(subject)}
						</span>
					</button>
				);
			})}
			{onMultipleChange && subjects.length > 1 ? (
				<label className="mt-2 flex cursor-pointer items-center gap-2 border-t px-2.5 pt-3 text-sm text-muted-foreground">
					<Switch checked={multiple} onCheckedChange={onMultipleChange} />
					Several subjects at once
				</label>
			) : null}
		</nav>
	);
}

/** Phone/tablet strip of subject chips; keeps the selected chip scrolled into view. */
export function SubjectChips({ subjects, selectedIds, onSelect }: Props) {
	const stripRef = useRef<HTMLDivElement>(null);
	const firstSelectedId = selectedIds[0];

	useEffect(() => {
		const strip = stripRef.current;
		const chip = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
		if (!strip || !chip) return;
		const chipStart = chip.offsetLeft - strip.offsetLeft;
		if (
			chipStart < strip.scrollLeft ||
			chipStart + chip.offsetWidth > strip.scrollLeft + strip.clientWidth
		) {
			strip.scrollLeft = chipStart - 12;
		}
	}, [firstSelectedId]);

	return (
		<div
			ref={stripRef}
			role="tablist"
			aria-label="Subjects"
			className="-mx-2 flex gap-1.5 overflow-x-auto px-2 pb-1.5 pt-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0"
		>
			{subjects.map((subject) => {
				const selected = selectedIds.includes(subject.id);
				return (
					<button
						key={subject.id}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onSelect(subject.id)}
						className={cn(
							"inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-background pe-3 ps-2 text-sm transition-colors",
							selected &&
								"border-foreground bg-foreground text-background",
						)}
					>
						<ProgressRing
							completed={subject.completed}
							total={subject.total}
							size={16}
						/>
						<span className="max-w-40 truncate" dir="auto">
							{subject.title}
						</span>
						<span
							className={cn(
								"text-[11px] tabular-nums",
								selected ? "opacity-75" : "text-muted-foreground",
							)}
						>
							{subject.hasAssessments
								? `${subject.completed}/${subject.total}`
								: "–"}
						</span>
					</button>
				);
			})}
		</div>
	);
}

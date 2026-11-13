"use client";

import type { ActivityPart } from "@school-clerk/utils/activity";
import { cn } from "@school-clerk/ui/cn";
import { Fragment, type ReactNode } from "react";

/*
 * Rich activity sentence (ADR-0093, Workshop 03 Grouped digest): every part
 * kind has its own style so a reader can scan who, which student, which class
 * and how much at a glance.
 */

const COUNT_TONES = {
	positive: "text-emerald-700 dark:text-emerald-400",
	negative: "text-red-600 dark:text-red-400",
	warning: "text-amber-600 dark:text-amber-400",
	neutral: "text-foreground",
} as const;

export const activityPartClasses = {
	actor: "font-semibold text-foreground",
	system: "font-semibold text-muted-foreground",
	text: "text-muted-foreground",
	student: "font-medium text-blue-700 dark:text-sky-300",
	classroom:
		"inline-block whitespace-nowrap rounded-full border border-input bg-card px-[7px] align-baseline text-[0.84em] font-medium leading-[1.45] text-foreground",
	amountPositive:
		"inline-block rounded px-1.5 align-baseline text-[0.9em] font-medium tabular-nums leading-[1.45] text-foreground bg-emerald-50 dark:bg-emerald-400/12",
	amountNegative:
		"inline-block rounded px-1.5 align-baseline text-[0.9em] font-medium tabular-nums leading-[1.45] bg-red-50 text-red-700 dark:bg-red-400/12 dark:text-red-300",
	muted: "text-muted-foreground",
	quote: "italic text-muted-foreground",
	many: "font-semibold text-foreground",
} as const;

function CountPart({
	text,
	tone,
}: {
	text: string;
	tone?: keyof typeof COUNT_TONES;
}) {
	const match = /^([\d,.]+)(.*)$/.exec(text);
	if (!match) return <span className={activityPartClasses.muted}>{text}</span>;
	return (
		<span className={activityPartClasses.muted}>
			<b className={cn("font-semibold tabular-nums", COUNT_TONES[tone ?? "neutral"])}>
				{match[1]}
			</b>
			{match[2]}
		</span>
	);
}

export function ActivityPartView({
	part,
	plain,
	onStudentClick,
}: {
	part: ActivityPart;
	/** Plain = no interactive children (inside another button, e.g. the bell). */
	plain?: boolean;
	onStudentClick?: (studentId: string) => void;
}) {
	switch (part.kind) {
		case "actor":
			return (
				<span
					className={
						part.userId ? activityPartClasses.actor : activityPartClasses.system
					}
				>
					{part.text}
				</span>
			);
		case "student":
			if (!plain && onStudentClick) {
				return (
					<button
						type="button"
						className={cn(
							activityPartClasses.student,
							"underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none",
						)}
						onClick={(event) => {
							event.stopPropagation();
							onStudentClick(part.id);
						}}
					>
						{part.text}
					</button>
				);
			}
			return <span className={activityPartClasses.student}>{part.text}</span>;
		case "classroom":
			return <span className={activityPartClasses.classroom}>{part.text}</span>;
		case "amount":
			return (
				<span
					className={
						part.tone === "negative"
							? activityPartClasses.amountNegative
							: activityPartClasses.amountPositive
					}
				>
					{part.text}
				</span>
			);
		case "count":
			return <CountPart text={part.text} tone={part.tone} />;
		case "term":
		case "date":
			return <span className={activityPartClasses.muted}>{part.text}</span>;
		case "quote":
			return <span className={activityPartClasses.quote}>“{part.text}”</span>;
		default:
			return <span className={activityPartClasses.text}>{part.text}</span>;
	}
}

/** Renders parts separated by single spaces. `extra` nodes may be appended. */
export function ActivityParts({
	parts,
	plain,
	onStudentClick,
	className,
	children,
}: {
	parts: readonly ActivityPart[];
	plain?: boolean;
	onStudentClick?: (studentId: string) => void;
	className?: string;
	children?: ReactNode;
}) {
	return (
		<span className={className}>
			{parts.map((part, index) => (
				// Parts are positional and never reorder.
				// biome-ignore lint/suspicious/noArrayIndexKey: positional sentence segments
				<Fragment key={index}>
					{index > 0 ? " " : null}
					<ActivityPartView
						part={part}
						plain={plain}
						onStudentClick={onStudentClick}
					/>
				</Fragment>
			))}
			{children}
		</span>
	);
}

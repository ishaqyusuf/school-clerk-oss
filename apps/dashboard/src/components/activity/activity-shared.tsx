"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { formatActivityAmount } from "@school-clerk/notifications/activities";
import type { ActivityAction } from "@school-clerk/utils/activity";
import { cn } from "@school-clerk/ui/cn";
import {
	type DigestActivity,
	burstPillLabels,
	sumAmounts,
	sumAttendance,
} from "./activity-digest";
import { ActivityParts, activityPartClasses } from "./activity-parts";

export type ActivityFeedItem =
	RouterOutputs["activity"]["list"]["items"][number];

export function formatActivityTime(value: Date | string | null | undefined) {
	if (!value) return "";
	return new Date(value).toLocaleTimeString("en-NG", {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatActivityExact(value: Date | string | null | undefined) {
	if (!value) return "";
	return new Date(value).toLocaleString("en-NG", {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatActivityShortDay(value: Date | string | null | undefined) {
	if (!value) return "";
	return new Date(value).toLocaleDateString("en-NG", {
		day: "numeric",
		month: "short",
	});
}

export function burstTimeRange(items: readonly DigestActivity[]) {
	const newest = items[0]?.createdAt;
	const oldest = items[items.length - 1]?.createdAt;
	return `${formatActivityTime(oldest)}–${formatActivityTime(newest)}`;
}

const BURST_NOUNS: Partial<Record<string, [string, string, string]>> = {
	// type: [verb, singular, plural]
	student_created: ["added", "student", "students"],
	student_enrolled: ["enrolled", "student", "students"],
	student_class_changed: ["moved", "student", "students"],
	assessment_workbook_imported: ["imported", "workbook", "workbooks"],
};

/** "Aisha Bello took attendance for 6 classes — 168 present · 8 absent". */
export function BurstSentence({
	type,
	items,
	label,
	className,
}: {
	type: string;
	items: readonly DigestActivity[];
	label: string;
	className?: string;
}) {
	const first = items[0];
	if (!first) return null;
	const actor = first.parts?.find((part) => part.kind === "actor") ?? {
		kind: "actor" as const,
		text: first.actor?.name ?? "School Clerk",
		userId: first.actor?.userId ?? null,
	};
	const count = items.length;
	const actorNode = <ActivityParts parts={[actor]} />;
	const many = (text: string) => (
		<b className={activityPartClasses.many}>{text}</b>
	);
	const muted = (text: string) => (
		<span className={activityPartClasses.text}>{text}</span>
	);

	if (type === "attendance_created") {
		const totals = sumAttendance(items);
		return (
			<span className={className}>
				{actorNode} {muted("took attendance for")} {many(`${count} classes`)}{" "}
				{muted("—")}{" "}
				<ActivityParts
					parts={[
						{ kind: "count", text: `${totals.present} present`, tone: "positive" },
						...(totals.late
							? [
									{ kind: "text" as const, text: "·" },
									{ kind: "count" as const, text: `${totals.late} late`, tone: "warning" as const },
								]
							: []),
						{ kind: "text", text: "·" },
						{
							kind: "count",
							text: `${totals.absent} absent`,
							tone: totals.absent ? "negative" : "neutral",
						},
					]}
				/>
			</span>
		);
	}
	if (type === "student_payment_received") {
		const total = sumAmounts(items);
		return (
			<span className={className}>
				{actorNode} {muted("received")}{" "}
				<ActivityParts
					parts={[
						{
							kind: "amount",
							text: formatActivityAmount(total),
							value: total,
							tone: "positive",
						},
					]}
				/>{" "}
				{muted("from")} {many(`${count} students`)}
			</span>
		);
	}
	const noun = BURST_NOUNS[type];
	if (noun) {
		return (
			<span className={className}>
				{actorNode} {muted(noun[0])} {many(`${count} ${count === 1 ? noun[1] : noun[2]}`)}
			</span>
		);
	}
	return (
		<span className={className}>
			{actorNode} {muted(`· ${label.toLowerCase()}`)} {many(`× ${count}`)}
		</span>
	);
}

export function BurstPills({
	type,
	items,
	max,
}: {
	type: string;
	items: readonly DigestActivity[];
	max: number;
}) {
	const labels = burstPillLabels(type as DigestActivity["type"], items);
	if (!labels.length) return null;
	const shown = labels.slice(0, max);
	const hidden = labels.length - shown.length;
	return (
		<div className="mt-1.5 flex flex-wrap gap-[5px]">
			{shown.map((label, index) =>
				type === "attendance_created" ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: labels can repeat
					<span key={index} className={activityPartClasses.classroom}>
						{label}
					</span>
				) : (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: labels can repeat
						key={index}
						className="rounded-full bg-muted px-[7px] text-[12.5px] leading-[1.6]"
					>
						{label}
					</span>
				),
			)}
			{hidden > 0 ? (
				<span className="px-1 text-xs leading-[1.7] text-muted-foreground">
					+{hidden}
				</span>
			) : null}
		</div>
	);
}

export function activityActionLabel(action: ActivityAction | null | undefined) {
	switch (action?.kind) {
		case "student":
			return "Open student";
		case "payment":
			return "Open payment";
		case "attendance":
			return "Open attendance";
		case "href":
			return "Open";
		default:
			return null;
	}
}

/** Meta line under a row: separated by middots. */
export function ActivityMeta({
	children,
	className,
}: {
	children: React.ReactNode[];
	className?: string;
}) {
	const nodes = children.filter(Boolean);
	return (
		<div
			className={cn(
				"mt-[3px] flex flex-wrap items-center text-[12.5px] text-muted-foreground",
				className,
			)}
		>
			{nodes.map((node, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static positional meta
				<span key={index} className="inline-flex items-center">
					{index > 0 ? <span className="px-[7px]">·</span> : null}
					{node}
				</span>
			))}
		</div>
	);
}

"use client";

import { useTRPC } from "@/trpc/client";
import { formatActivityAmount } from "@school-clerk/notifications/activities";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, GraduationCap, X } from "lucide-react";
import type { ReactNode } from "react";
import { sumAmounts, sumAttendance } from "./activity-digest";
import { ActivityParts, activityPartClasses } from "./activity-parts";
import {
	type ActivityFeedItem,
	ActivityMeta,
	BurstSentence,
	activityActionLabel,
	burstTimeRange,
	formatActivityExact,
	formatActivityShortDay,
	formatActivityTime,
} from "./activity-shared";
import { ActivityAvatar, ActivityCategoryChip } from "./activity-visuals";
import { useCanOpenRoute } from "./use-can-open-route";

export type ActivityBurst = {
	id: string;
	type: ActivityFeedItem["type"];
	items: ActivityFeedItem[];
};

function studentHref(studentId: string) {
	return `/students?${new URLSearchParams({ studentViewId: studentId, studentViewTab: "overview" })}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="mt-[22px]">
			<h4 className="mb-2.5 text-[12.5px] font-semibold text-muted-foreground">
				{title}
			</h4>
			{children}
		</section>
	);
}

function DetailGrid({ rows }: { rows: { label: string; value: ReactNode }[] }) {
	if (!rows.length) return null;
	return (
		<dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card">
			{rows.map((row, index) => (
				<div
					key={`${row.label}-${index}`}
					className={cn(
						"min-w-0 border-b px-3 py-2.5",
						index % 2 === 0 && "border-r",
					)}
				>
					<dt className="text-xs text-muted-foreground">{row.label}</dt>
					<dd className="mt-0.5 break-words font-medium">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}

const ATTENDANCE_SEGMENTS = [
	{ key: "Present", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
	{ key: "Late", bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
	{ key: "Absent", bar: "bg-red-500", text: "text-red-600 dark:text-red-400" },
	{ key: "Excused", bar: "bg-muted-foreground/40", text: "text-muted-foreground" },
] as const;

function AttendanceBlock({
	counts,
	caption,
}: {
	counts: Record<string, number>;
	caption?: string;
}) {
	const total = ATTENDANCE_SEGMENTS.reduce(
		(sum, segment) => sum + (counts[segment.key] ?? 0),
		0,
	);
	return (
		<div className="rounded-lg border bg-card p-3">
			<div className="grid grid-cols-4 gap-2">
				{ATTENDANCE_SEGMENTS.map((segment) => (
					<div key={segment.key}>
						<div
							className={cn(
								"font-mono text-lg font-semibold tabular-nums",
								segment.text,
							)}
						>
							{counts[segment.key] ?? 0}
						</div>
						<div className="text-xs text-muted-foreground">{segment.key}</div>
					</div>
				))}
			</div>
			{total > 0 ? (
				<div
					className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
					role="img"
					aria-label={ATTENDANCE_SEGMENTS.map(
						(segment) => `${counts[segment.key] ?? 0} ${segment.key.toLowerCase()}`,
					).join(", ")}
				>
					{ATTENDANCE_SEGMENTS.filter((segment) => counts[segment.key]).map(
						(segment) => (
							<span
								key={segment.key}
								className={segment.bar}
								style={{ flex: counts[segment.key] }}
							/>
						),
					)}
				</div>
			) : null}
			<div className="mt-2 text-xs text-muted-foreground">
				{total} students{caption ? ` · ${caption}` : ""}
			</div>
		</div>
	);
}

function RelatedRow({
	item,
	onOpen,
	withDay,
}: {
	item: ActivityFeedItem;
	onOpen: (id: string) => void;
	withDay?: boolean;
}) {
	return (
		<div className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-b py-[9px] last:border-b-0">
			<ActivityAvatar name={item.actor.name} userId={item.actor.userId} size="sm" className="mt-0.5" />
			<button
				type="button"
				className="-mx-2 -my-1 min-w-0 rounded-md px-2 py-1 text-left hover:bg-muted"
				onClick={() => onOpen(item.id)}
			>
				<ActivityParts parts={item.parts} plain className="text-[13.5px] leading-relaxed" />
				<ActivityMeta>
					{[
						<span key="t" className="font-mono text-xs">
							{withDay ? `${formatActivityShortDay(item.createdAt)} · ` : ""}
							{formatActivityTime(item.createdAt)}
						</span>,
						item.label,
					]}
				</ActivityMeta>
			</button>
		</div>
	);
}

function SheetShell({
	open,
	onOpenChange,
	title,
	description,
	onBack,
	footer,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: string;
	onBack?: () => void;
	footer?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				hideClose
				className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]"
			>
				<SheetHeader className="flex-row items-center gap-2 space-y-0 border-b px-4 py-3">
					{onBack ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-9 shrink-0"
							onClick={onBack}
							aria-label="Back"
						>
							<ArrowLeft className="size-4" />
						</Button>
					) : null}
					<SheetTitle className="min-w-0 flex-1 text-base">{title}</SheetTitle>
					<SheetDescription className="sr-only">{description}</SheetDescription>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-9 shrink-0"
						onClick={() => onOpenChange(false)}
						aria-label="Close"
					>
						<X className="size-4" />
					</Button>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
				{footer ? (
					<div className="flex justify-end gap-2 border-t px-4 py-3">{footer}</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function detailValue(label: string, value: string, negative?: boolean): ReactNode {
	if (label === "Amount")
		return (
			<span
				className={cn(
					negative ? activityPartClasses.amountNegative : activityPartClasses.amountPositive,
					"text-lg",
				)}
			>
				{value}
			</span>
		);
	if (label === "Class" || label === "From" || label === "To")
		return <span className={activityPartClasses.classroom}>{value}</span>;
	if (label === "Reference") return <span className="font-mono text-[13px]">{value}</span>;
	return value;
}

const ATTENDANCE_DETAIL_KEYS = new Set(["Present", "Absent", "Late", "Excused", "Leave", "Total"]);

export function ActivityDetailSheet({
	activityId,
	onClose,
	onOpenActivity,
	onBack,
}: {
	activityId: string | null;
	onClose: () => void;
	onOpenActivity: (id: string) => void;
	onBack?: () => void;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const canOpen = useCanOpenRoute();
	const query = useQuery({
		...trpc.activity.byId.queryOptions({ id: activityId ?? "", relatedLimit: 5 }),
		enabled: Boolean(activityId),
	});
	const data = query.data;
	const item = data?.item;
	const isAttendance = item?.category === "attendance";
	const counts = Object.fromEntries(
		(data?.details ?? [])
			.filter((detail) => ATTENDANCE_DETAIL_KEYS.has(detail.label))
			.map((detail) => [detail.label, Number(detail.value.replace(/,/g, "")) || 0]),
	);
	const otherDetails = (data?.details ?? []).filter(
		(detail) => !(isAttendance && ATTENDANCE_DETAIL_KEYS.has(detail.label)),
	);
	const students = (item?.parts ?? []).flatMap((part) =>
		part.kind === "student" ? [{ id: part.id, name: part.text }] : [],
	);
	const actionLabel = activityActionLabel(item?.action);
	const negativeAmount =
		item?.type === "student_payment_reversed" ||
		item?.type === "student_payment_refund" ||
		item?.type === "student_payment_cancelled";
	// Navigate without clearing `activityId` first: that URL update races the
	// push and keeps the user on /activity. Leaving the page closes the sheet.
	const go = (href: string) => {
		router.push(href);
	};

	return (
		<SheetShell
			open={Boolean(activityId)}
			onOpenChange={(open) => (!open ? onClose() : undefined)}
			onBack={onBack}
			description="Activity details"
			title={
				item ? (
					<span className="inline-flex items-center gap-2">
						<ActivityCategoryChip category={item.category} icon={item.icon} />
						{item.label}
					</span>
				) : (
					"Activity"
				)
			}
			footer={
				item?.href && actionLabel && canOpen(item.href) ? (
					<Button type="button" onClick={() => go(item.href as string)}>
						{actionLabel}
						<ArrowRight className="ml-1.5 size-4" />
					</Button>
				) : null
			}
		>
			{query.isError ? (
				<div role="alert" className="text-sm">
					<p>This activity could not be loaded. It may be outside your access.</p>
					<Button type="button" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
						Try again
					</Button>
				</div>
			) : !item ? (
				<div className="space-y-3" role="status" aria-label="Loading activity">
					<Skeleton className="h-6 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="mt-6 h-28 w-full" />
				</div>
			) : (
				<>
					<div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
						<ActivityAvatar name={item.actor.name} userId={item.actor.userId} size="lg" />
						<div className="min-w-0">
							<ActivityParts
								parts={item.parts}
								className="text-base leading-relaxed"
								onStudentClick={
									canOpen("/students") ? (id) => go(studentHref(id)) : undefined
								}
							/>
							<p className="mt-1 text-[12.5px] text-muted-foreground">
								{item.actor.name} ·{" "}
								<span className="font-mono text-xs">{formatActivityExact(item.createdAt)}</span>
							</p>
						</div>
					</div>

					<Section title="Details">
						{isAttendance && Object.keys(counts).length ? (
							<div className="space-y-3">
								<AttendanceBlock
									counts={counts}
									caption={data?.details.find((detail) => detail.label === "Date")?.value}
								/>
								<DetailGrid
									rows={otherDetails
										.filter((detail) => detail.label !== "Date")
										.map((detail) => ({
											label: detail.label,
											value: detailValue(detail.label, detail.value, negativeAmount),
										}))}
								/>
							</div>
						) : otherDetails.length ? (
							<DetailGrid
								rows={otherDetails.map((detail) => ({
									label: detail.label,
									value: detailValue(detail.label, detail.value, negativeAmount),
								}))}
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								{item.description ?? "No further details were recorded."}
							</p>
						)}
					</Section>

					{students.length && canOpen("/students") ? (
						<Section title="Linked">
							<div className="flex flex-wrap gap-2">
								{students.map((student) => (
									<button
										key={student.id}
										type="button"
										className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card py-1.5 pl-2.5 pr-3 text-left text-[13.5px] font-medium hover:border-primary md:min-h-0"
										onClick={() => go(studentHref(student.id))}
									>
										<GraduationCap className="size-3.5 text-muted-foreground" />
										<span>
											<small className="block text-[11px] font-normal text-muted-foreground">
												Student
											</small>
											{student.name}
										</span>
									</button>
								))}
							</div>
						</Section>
					) : null}

					<Section title="Related activity">
						{data?.related.length ? (
							<div>
								{data.related.map((related) => (
									<RelatedRow key={related.id} item={related} onOpen={onOpenActivity} withDay />
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Nothing else about this yet.</p>
						)}
					</Section>
				</>
			)}
		</SheetShell>
	);
}

export function ActivityBurstSheet({
	burst,
	onClose,
	onOpenActivity,
}: {
	burst: ActivityBurst | null;
	onClose: () => void;
	onOpenActivity: (id: string) => void;
}) {
	const router = useRouter();
	const canOpen = useCanOpenRoute();
	const first = burst?.items[0];
	const totals = burst?.type === "attendance_created" ? sumAttendance(burst.items) : null;
	const students = new Map<string, string>();
	for (const item of burst?.items ?? []) {
		for (const part of item.parts) {
			if (part.kind === "student") students.set(part.id, part.text);
		}
	}
	const actionLabel = activityActionLabel(first?.action);

	return (
		<SheetShell
			open={Boolean(burst)}
			onOpenChange={(open) => (!open ? onClose() : undefined)}
			description="Grouped activity"
			title={
				first ? (
					<span className="inline-flex items-center gap-2">
						<ActivityCategoryChip category={first.category} icon={first.icon} />
						{first.label}
						<Badge variant="secondary">{burst?.items.length}</Badge>
					</span>
				) : (
					"Activity"
				)
			}
			footer={
				first?.href && actionLabel && canOpen(first.href) ? (
					<Button
						type="button"
						onClick={() => {
							onClose();
							router.push(first.href as string);
						}}
					>
						{actionLabel}
						<ArrowRight className="ml-1.5 size-4" />
					</Button>
				) : null
			}
		>
			{burst && first ? (
				<>
					<div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
						<ActivityAvatar name={first.actor.name} userId={first.actor.userId} size="lg" />
						<div className="min-w-0">
							<BurstSentence
								type={burst.type}
								items={burst.items}
								label={first.label}
								className="text-base leading-relaxed"
							/>
							<p className="mt-1 text-[12.5px] text-muted-foreground">
								{first.actor.name} ·{" "}
								<span className="font-mono text-xs">
									{formatActivityShortDay(first.createdAt)} · {burstTimeRange(burst.items)}
								</span>
							</p>
						</div>
					</div>

					{totals ? (
						<Section title="Summary">
							<AttendanceBlock
								counts={{ Present: totals.present, Late: totals.late, Absent: totals.absent }}
								caption={`${burst.items.length} classes`}
							/>
						</Section>
					) : burst.type === "student_payment_received" ? (
						<Section title="Summary">
							<DetailGrid
								rows={[
									{
										label: "Total",
										value: (
											<span className={cn(activityPartClasses.amountPositive, "text-lg")}>
												{formatActivityAmount(sumAmounts(burst.items))}
											</span>
										),
									},
									{ label: "Payments", value: burst.items.length },
								]}
							/>
						</Section>
					) : null}

					<Section title={`${burst.items.length} activities`}>
						<div>
							{burst.items.map((item) => (
								<RelatedRow key={item.id} item={item} onOpen={onOpenActivity} />
							))}
						</div>
					</Section>

					{students.size && canOpen("/students") ? (
						<Section title="Linked">
							<div className="flex flex-wrap gap-2">
								{[...students].map(([id, name]) => (
									<button
										key={id}
										type="button"
										className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card py-1.5 pl-2.5 pr-3 text-left text-[13.5px] font-medium hover:border-primary md:min-h-0"
										onClick={() => {
											onClose();
											router.push(studentHref(id));
										}}
									>
										<GraduationCap className="size-3.5 text-muted-foreground" />
										<span>
											<small className="block text-[11px] font-normal text-muted-foreground">
												Student
											</small>
											{name}
										</span>
									</button>
								))}
							</div>
						</Section>
					) : null}
				</>
			) : null}
		</SheetShell>
	);
}

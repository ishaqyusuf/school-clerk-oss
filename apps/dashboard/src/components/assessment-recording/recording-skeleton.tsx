"use client";

import { cn } from "@school-clerk/ui/cn";
import { Skeleton } from "@school-clerk/ui/skeleton";

type Props = {
	className?: string;
	/** Number of student rows to sketch in the table. */
	rows?: number;
};

/** Deterministic name widths so server and client markup match. */
const NAME_WIDTHS = [
	"w-[72%]",
	"w-[55%]",
	"w-[64%]",
	"w-[46%]",
	"w-[80%]",
	"w-[58%]",
	"w-[68%]",
	"w-[42%]",
	"w-[61%]",
	"w-[76%]",
];
const CHIP_WIDTHS = ["w-32", "w-24", "w-28", "w-20"];
const RAIL_TITLE_WIDTHS = [
	"w-[70%]",
	"w-[52%]",
	"w-[84%]",
	"w-[60%]",
	"w-[46%]",
];

function Bone({ className }: { className?: string }) {
	return (
		<Skeleton
			className={cn("rounded-sm motion-reduce:animate-none", className)}
		/>
	);
}

function nameWidth(index: number) {
	return NAME_WIDTHS[index % NAME_WIDTHS.length];
}

function rowIds(rows: number) {
	return Array.from(
		{ length: Math.max(rows, 0) },
		(_, index) => `row-${index}`,
	);
}

/** Score cell placeholder matching the real 76px fixed score column. */
function ScoreCellBone({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex w-[76px] shrink-0 items-center justify-center border-e",
				className,
			)}
		>
			<Bone className="h-3 w-6" />
		</div>
	);
}

/** Two-line assessment column heading (title + obtainable). */
function ScoreHeadBone({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex w-[76px] shrink-0 flex-col items-center justify-center gap-1.5 border-e px-1",
				className,
			)}
		>
			<Bone className="h-2.5 w-11" />
			<Bone className="h-2.5 w-6" />
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Phone (< md)                                                        */
/* ------------------------------------------------------------------ */

function MobileSkeleton({ rows }: { rows: number }) {
	const ids = rowIds(rows);

	return (
		<div className="md:hidden">
			<header className="mb-3 flex items-start gap-2 border-b pb-3">
				<div className="min-w-0 flex-1 pt-1">
					<Bone className="h-6 w-[60%]" />
					<Bone className="mt-2 h-3 w-[45%]" />
				</div>
				{/* Filters, More */}
				<Bone className="size-11 shrink-0 rounded-md" />
				<Bone className="size-11 shrink-0 rounded-md" />
			</header>

			<div className="-mx-2 mb-3 flex items-center gap-2 bg-background px-2 pb-2 pt-1">
				<Bone className="h-11 min-w-0 flex-1 rounded-full" />
				<Bone className="size-11 shrink-0 rounded-full" />
			</div>

			<div className="w-full overflow-hidden rounded-md border bg-background">
				<div className="flex h-12 border-b">
					<div className="flex min-w-0 flex-1 items-center border-e px-4">
						<Bone className="h-3 w-14" />
					</div>
					<ScoreHeadBone className="border-e-0" />
				</div>
				{ids.map((id, index) => (
					<div key={id} className="flex h-10 border-b last:border-b-0">
						<div className="flex min-w-0 flex-1 items-center gap-1.5 border-e px-4">
							<Bone className="h-3 w-4 shrink-0" />
							<div className="min-w-0 flex-1">
								<Bone className={cn("h-3.5", nameWidth(index))} />
							</div>
						</div>
						<ScoreCellBone className="border-e-0" />
					</div>
				))}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Tablet (md..lg) and desktop (lg+)                                   */
/* ------------------------------------------------------------------ */

function WideHeader() {
	return (
		<header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-3">
			<div className="min-w-0 flex-1 basis-56">
				<Bone className="h-6 w-56 max-w-[60%]" />
				<Bone className="mt-2 h-3 w-40 max-w-[45%]" />
			</div>
			<div className="flex items-center gap-2">
				{/* Add student, Workbooks, More */}
				<Bone className="h-8 w-[118px] rounded-md" />
				<Bone className="h-8 w-[112px] rounded-md" />
				<Bone className="size-8 rounded-md" />
			</div>
		</header>
	);
}

function RailSkeleton() {
	return (
		<div className="grid gap-0.5">
			<Bone className="mx-2.5 mb-2.5 mt-0.5 h-3 w-16" />
			{RAIL_TITLE_WIDTHS.map((width, index) => (
				<div
					key={width}
					className={cn(
						"grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2.5 py-2",
						index === 0 && "bg-accent",
					)}
				>
					<span className="size-5 rounded-full border-[3px] border-border" />
					<Bone className={cn("h-3.5", width)} />
					<Bone className="h-3 w-7" />
				</div>
			))}
		</div>
	);
}

function ChipsSkeleton() {
	return (
		<div className="flex gap-1.5 overflow-hidden pb-1.5 pt-0.5">
			{CHIP_WIDTHS.map((width) => (
				<Bone key={width} className={cn("h-9 shrink-0 rounded-full", width)} />
			))}
		</div>
	);
}

function WideTableSkeleton({ rows }: { rows: number }) {
	const ids = rowIds(rows);

	return (
		<div className="w-full overflow-hidden rounded-md border bg-background">
			<div className="flex h-12 border-b">
				<div className="flex w-[220px] shrink-0 items-center border-e px-4">
					<Bone className="h-3 w-14" />
				</div>
				<ScoreHeadBone />
				<ScoreHeadBone />
				<ScoreHeadBone className="hidden lg:flex" />
				<div className="min-w-0 flex-1" />
			</div>
			{ids.map((id, index) => (
				<div key={id} className="flex h-10 border-b last:border-b-0">
					<div className="flex w-[220px] shrink-0 items-center gap-1.5 border-e px-4">
						<Bone className="h-3 w-4 shrink-0" />
						<div className="min-w-0 flex-1">
							<Bone className={cn("h-3.5", nameWidth(index))} />
						</div>
					</div>
					<ScoreCellBone />
					<ScoreCellBone />
					<ScoreCellBone className="hidden lg:flex" />
					<div className="min-w-0 flex-1" />
				</div>
			))}
		</div>
	);
}

function WideSkeleton({ rows }: { rows: number }) {
	return (
		<div className="hidden md:block">
			<WideHeader />
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-6">
				<aside className="hidden lg:block">
					<RailSkeleton />
				</aside>
				<div className="lg:hidden">
					<ChipsSkeleton />
				</div>
				<section className="min-w-0 space-y-3">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<Bone className="h-5 w-32" />
						<Bone className="h-4 w-24" />
						<Bone className="ms-auto h-9 w-56 rounded-md" />
					</div>
					<WideTableSkeleton rows={rows} />
				</section>
			</div>
		</div>
	);
}

/**
 * Full-page placeholder for the Assessment Recording workspace. Mirrors the
 * real layout per breakpoint (phone header + subject bar, tablet chips,
 * desktop subject rail) so the page does not jump when data arrives.
 */
export function AssessmentRecordingSkeleton({ className, rows = 12 }: Props) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: <output> only allows phrasing content; this wraps block layout.
		<div
			role="status"
			aria-busy="true"
			aria-live="polite"
			className={cn("w-full", className)}
		>
			<span className="sr-only">Loading assessment recording…</span>
			<div aria-hidden="true">
				<MobileSkeleton rows={rows} />
				<WideSkeleton rows={rows} />
			</div>
		</div>
	);
}

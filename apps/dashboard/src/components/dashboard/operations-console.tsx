import "server-only";

import {
	type DashboardOverview,
	getDashboardOverview,
	getDashboardStats,
	prisma,
	termWeekProgress,
} from "@school-clerk/db";
import { Badge } from "@school-clerk/ui/badge";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { cn } from "@school-clerk/ui/cn";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { classroomDisplayName } from "@school-clerk/utils/classroom-name";
import { formatStudentName } from "@school-clerk/utils/student-name";
import {
	measurePerformance,
	withPerformanceContext,
} from "@school-clerk/utils/server-performance";
import { ArrowUpRight } from "lucide-react";
import { getServerRequestContext } from "@/trpc/request-context";
import { DashboardOnboardingNudges } from "./dashboard-stats";

const TIME_ZONE = "Africa/Lagos";

const naira = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	notation: "compact",
	maximumFractionDigits: 2,
});
const dayLabel = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	weekday: "short",
	day: "numeric",
	month: "short",
});
const timeLabel = new Intl.DateTimeFormat("en-GB", {
	timeZone: TIME_ZONE,
	hour: "2-digit",
	minute: "2-digit",
});

function percent(part: number, whole: number) {
	return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** Slim progress bar (Clear Slate, ADR-0094); amber below `warnBelow`. */
function Meter({ value, warnBelow }: { value: number; warnBelow: number }) {
	return (
		<span className="block h-1.5 w-28 overflow-hidden rounded-full bg-border dark:bg-input" aria-hidden="true">
			<span
				className={cn("block h-full rounded-full", value < warnBelow ? "bg-chart-2" : "bg-primary")}
				style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
			/>
		</span>
	);
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<span className={cn("text-[13px] font-medium text-muted-foreground", className)}>{children}</span>
	);
}

function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
	return (
		<header className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
			<h2 className="text-[15px] font-semibold">{title}</h2>
			{children}
		</header>
	);
}

const panel = "rounded-xl border bg-card shadow-xs";

export async function OperationsConsole({
	schoolId,
	sessionId,
	termId,
}: {
	schoolId: string;
	sessionId: string;
	termId: string;
}) {
	const { requestId } = await getServerRequestContext();
	const now = new Date();
	const [overview, stats] = await withPerformanceContext(requestId, () =>
		measurePerformance("dashboard.overview", () =>
			Promise.all([
				getDashboardOverview(prisma, { schoolId, sessionId, termId, now, timeZone: TIME_ZONE }),
				getDashboardStats(prisma, schoolId, sessionId),
			]),
		),
	);

	return (
		<div className="space-y-4">
			<StatusStrip overview={overview} now={now} />
			<KpiRail overview={overview} />
			<TermTrack overview={overview} now={now} />
			<div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<ClassMatrix overview={overview} />
				<div className="space-y-4">
					<OpenItems overview={overview} />
					<LatestPayments overview={overview} />
				</div>
			</div>
			<DashboardOnboardingNudges sessionId={sessionId} stats={stats} />
		</div>
	);
}

function StatusStrip({ overview, now }: { overview: DashboardOverview; now: Date }) {
	const progress = termWeekProgress(overview.term, now);
	const segments = [
		overview.term && {
			label: "Term",
			value: [overview.term.sessionTitle, overview.term.title].filter(Boolean).join(" · "),
		},
		progress && {
			label: "Week",
			value: `${String(progress.currentWeek).padStart(2, "0")}/${progress.totalWeeks}`,
		},
		{ label: "Today", value: dayLabel.format(now) },
		progress && { label: "Left", value: `${progress.daysLeft} days` },
	].filter(Boolean) as { label: string; value: string }[];

	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
			{segments.map((segment) => (
				<span key={segment.label} className="inline-flex items-center gap-1.5">
					{segment.label}
					<b className="font-semibold text-foreground">{segment.value}</b>
				</span>
			))}
		</div>
	);
}

function KpiRail({ overview }: { overview: DashboardOverview }) {
	const { attendance, fees, openItems } = overview;
	const presentPct = percent(attendance.present, attendance.marked);
	const open =
		openItems.pendingApplications +
		openItems.pendingRegistrations +
		openItems.unclassified +
		openItems.missingRegisters;
	const kpis = [
		{
			label: "Students",
			value: overview.students.toLocaleString("en-NG"),
			note: "Registered this term",
			href: "/students/list",
		},
		{
			label: "Present today",
			value: presentPct === null ? "—" : `${presentPct}%`,
			note:
				attendance.marked > 0
					? `${attendance.present} / ${attendance.marked} counted`
					: "No registers yet",
			href: "/academic/classes",
		},
		{
			label: "Collected",
			value: compact.format(fees.collected),
			note:
				fees.collectedToday > 0
					? `+${naira.format(fees.collectedToday)} today`
					: fees.charged > 0
						? `of ${compact.format(fees.charged)} charged`
						: "This term",
			tone: fees.collectedToday > 0 ? "up" : undefined,
			href: "/finance",
		},
		{
			label: "Outstanding",
			value: compact.format(fees.outstanding),
			note: `${fees.debtors} ${fees.debtors === 1 ? "student" : "students"}`,
			tone: fees.debtors > 0 ? "warn" : undefined,
			href: "/finance",
		},
		{
			label: "Open items",
			value: String(open).padStart(2, "0"),
			note: open > 0 ? "Needs review" : "All clear",
			tone: open > 0 ? "warn" : "up",
			href: "/students/list",
		},
	];

	return (
		<div
			data-summary-grid
			className="grid gap-3.5 sm:grid-cols-3 lg:grid-cols-5"
		>
			{kpis.map((kpi) => (
				<Link
					key={kpi.label}
					href={kpi.href}
					className={cn(panel, "group flex flex-col gap-1.5 p-[18px] transition-colors hover:border-primary/40")}
				>
					<span data-summary-label>
						<Label>{kpi.label}</Label>
					</span>
					<span
						data-summary-value
						className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums"
					>
						{kpi.value}
					</span>
					<span
						className={cn(
							"text-[13px] text-muted-foreground",
							kpi.tone === "up" && "text-status-success-fg",
							kpi.tone === "warn" && "text-status-warning-fg",
						)}
					>
						{kpi.note}
					</span>
				</Link>
			))}
		</div>
	);
}

function TermTrack({ overview, now }: { overview: DashboardOverview; now: Date }) {
	const progress = termWeekProgress(overview.term, now);
	if (!progress) return null;
	return (
		<section className={cn(panel, "px-4 py-3.5")} aria-label="Term progress">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-[15px] font-semibold">Term progress</h2>
				<Label>
					Week {progress.currentWeek} of {progress.totalWeeks} · {progress.daysLeft} days left
				</Label>
			</div>
			<div
				className="grid gap-1"
				style={{ gridTemplateColumns: `repeat(${progress.totalWeeks}, minmax(0, 1fr))` }}
			>
				{Array.from({ length: progress.totalWeeks }, (_, index) => {
					const week = index + 1;
					const state =
						week < progress.currentWeek ? "done" : week === progress.currentWeek ? "now" : "next";
					return (
						<div
							key={week}
							title={`Week ${week}`}
							className={cn(
								"flex h-9 items-end rounded-md border px-1.5 pb-1 text-[11px] tabular-nums",
								state === "done" && "border-primary/20 bg-primary/10 text-muted-foreground",
								state === "now" && "border-primary bg-primary/15 font-semibold text-foreground",
								state === "next" && "border-transparent bg-muted text-muted-foreground",
							)}
						>
							W{String(week).padStart(2, "0")}
						</div>
					);
				})}
			</div>
		</section>
	);
}

function ClassMatrix({ overview }: { overview: DashboardOverview }) {
	const rows = overview.classes.filter((row) => row.students > 0);
	return (
		<section className={cn(panel, "min-w-0 overflow-hidden")}>
			<PanelHeader title="Classes">
				<Label className="font-normal">Register today · Fees paid</Label>
			</PanelHeader>
			{rows.length === 0 ? (
				<p className="px-4 py-10 text-center text-sm text-muted-foreground">
					No students are registered in a class this term yet.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/60 text-left">
								{["Class", "Students", "Register", "Fees paid"].map((label, index) => (
									<th
										key={label}
										className={cn(
											"h-10 whitespace-nowrap px-4 text-[13px] font-medium text-muted-foreground",
											index === 1 && "text-right",
										)}
									>
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const attendance = row.register
									? percent(row.register.present, row.register.marked)
									: null;
								const fees =
									row.feesPaidRatio === null ? null : Math.round(row.feesPaidRatio * 100);
								return (
									<tr key={row.id} className="border-b last:border-b-0 hover:bg-accent/60">
										<td className="h-12 whitespace-nowrap px-4 text-left font-medium" dir="auto">
											{classroomDisplayName(row)}
										</td>
										<td className="px-4 text-right tabular-nums">{row.students}</td>
										<td className="whitespace-nowrap px-4">
											{row.register && attendance !== null ? (
												<span className="inline-flex items-center gap-2">
													<Meter value={attendance} warnBelow={90} />
													<span className="text-[13px] tabular-nums text-muted-foreground">
														{row.register.present}/{row.register.marked}
													</span>
												</span>
											) : (
												<Badge variant="warning">No register</Badge>
											)}
										</td>
										<td className="whitespace-nowrap px-4">
											{fees === null ? (
												<span className="text-[13px] text-muted-foreground">No charges</span>
											) : (
												<span className="inline-flex items-center gap-2.5">
													<Meter value={fees} warnBelow={55} />
													<span className="text-[13px] tabular-nums text-muted-foreground">{fees}%</span>
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

function OpenItems({ overview }: { overview: DashboardOverview }) {
	const { openItems } = overview;
	const items = [
		{
			count: openItems.pendingApplications,
			label: "Admission applications to review",
			href: "/students/enrollment",
			tone: "info" as const,
		},
		{
			count: openItems.pendingRegistrations,
			label: "Teacher-registered students awaiting approval",
			href: "/students/list",
			tone: "warning" as const,
		},
		{
			count: openItems.unclassified,
			label: "Students need classification",
			href: "/students/list",
			tone: "warning" as const,
		},
		{
			count: openItems.missingRegisters,
			label: "Classes without a register today",
			href: "/academic/classes",
			tone: "warning" as const,
		},
	].filter((item) => item.count > 0);

	return (
		<section className={cn(panel, "overflow-hidden")}>
			<PanelHeader title="Open items">
				<Label className="font-normal">{items.length === 0 ? "All clear" : `${items.length} queues`}</Label>
			</PanelHeader>
			{items.length === 0 ? (
				<p className="px-4 py-6 text-sm text-muted-foreground">Nothing needs your attention right now.</p>
			) : (
				<ul>
					{items.map((item) => (
						<li key={item.label} className="border-b last:border-b-0">
							<Link
								href={item.href}
								className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/60"
							>
								<Badge variant={item.tone} className="min-w-9 justify-center tabular-nums">
									{item.count}
								</Badge>
								<span className="flex-1">{item.label}</span>
								<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function LatestPayments({ overview }: { overview: DashboardOverview }) {
	const today = overview.dayKey;
	return (
		<section className={cn(panel, "overflow-hidden")}>
			<PanelHeader title="Latest payments">
				<Link href="/finance" className="text-[13px] font-medium text-primary hover:underline">
					View all
				</Link>
			</PanelHeader>
			{overview.recentPayments.length === 0 ? (
				<p className="px-4 py-6 text-sm text-muted-foreground">No student payments recorded yet.</p>
			) : (
				<ul className="text-sm">
					{overview.recentPayments.map((payment) => {
						const isToday =
							new Intl.DateTimeFormat("en-CA", {
								timeZone: TIME_ZONE,
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
							}).format(payment.paymentDate) === today;
						return (
							<li
								key={payment.id}
								className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2.5 border-b px-4 py-2.5 last:border-b-0"
							>
								<time className="text-[13px] tabular-nums text-muted-foreground">
									{isToday ? timeLabel.format(payment.paymentDate) : dayLabel.format(payment.paymentDate)}
								</time>
								<span className="truncate text-left" dir="auto">
									{formatStudentName(payment.student) || "Student"}
								</span>
								<span className="font-semibold tabular-nums text-status-success-fg">
									+{naira.format(payment.amount)}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

export function OperationsConsoleSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-6 w-80" />
			<div className="grid gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
				{Array.from({ length: 5 }, (_, index) => (
					<div key={index} className="space-y-2 rounded-xl border p-[18px]">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-7 w-24" />
						<Skeleton className="h-3 w-28" />
					</div>
				))}
			</div>
			<Skeleton className="h-20 w-full" />
			<div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<Skeleton className="h-80 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</div>
	);
}

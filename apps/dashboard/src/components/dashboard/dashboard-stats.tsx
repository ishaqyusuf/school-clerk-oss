import "server-only";

import { getDashboardStats, prisma } from "@school-clerk/db";
import {
	withPerformanceContext,
	measurePerformance,
} from "@school-clerk/utils/server-performance";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { Button } from "@school-clerk/ui/button";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { BookOpen, GraduationCap, Rocket, Users } from "lucide-react";
import { getServerRequestContext } from "@/trpc/request-context";

const statCards = [
	{
		key: "students" as const,
		title: "Total Students",
		icon: GraduationCap,
		href: "/students/list",
	},
	{
		key: "staff" as const,
		title: "Total Staff",
		icon: Users,
		href: "/staff/teachers",
	},
	{
		key: "classes" as const,
		title: "Active Classes",
		icon: BookOpen,
		href: "/academic/classes",
	},
];

export async function DashboardStats({
	schoolId,
	sessionId,
}: { schoolId: string; sessionId: string }) {
	const { requestId } = await getServerRequestContext();
	const stats = sessionId
		? await withPerformanceContext(requestId, () =>
				measurePerformance("dashboard.stats", () =>
					getDashboardStats(prisma, schoolId, sessionId),
				),
			)
		: { students: 0, staff: 0, classes: 0 };
	return (
		<>
			{/* Stat cards */}
			<div data-summary-grid className="grid gap-4 sm:grid-cols-3">
				{statCards.map((s) => (
					<Card key={s.key}>
						<CardHeader data-summary-header className="flex flex-row items-center justify-between pb-2">
							<CardTitle data-summary-label className="text-sm font-medium text-muted-foreground">
								{s.title}
							</CardTitle>
							<s.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent data-summary-body>
							<p data-summary-value className="text-3xl font-bold">{stats[s.key]}</p>
							<Link
								href={s.href}
								className="mt-1 text-xs text-primary hover:underline"
							>
								View all →
							</Link>
						</CardContent>
					</Card>
				))}
			</div>

			{!sessionId ? (
				<Card className="border-amber-200/70 bg-amber-50/70">
					<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-amber-900">
								<Rocket className="h-4 w-4" />
								<p className="font-medium">Finish onboarding</p>
							</div>
							<p className="text-sm text-amber-900/80">
								Create your first academic session to unlock the full dashboard
								experience.
							</p>
						</div>
						<Button asChild>
							<Link href="/onboarding/welcome">Continue onboarding</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			{sessionId && stats.classes === 0 ? (
				<Card className="border-emerald-200/70 bg-emerald-50/70">
					<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-emerald-900">
								<BookOpen className="h-4 w-4" />
								<p className="font-medium">Set up classrooms</p>
							</div>
							<p className="text-sm text-emerald-900/80">
								Your academic session is live. Add classrooms before inviting
								teachers into the workspace.
							</p>
						</div>
						<Button asChild>
							<Link href="/onboarding/setup-classrooms">Set up classrooms</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}

			{sessionId && stats.classes > 0 && stats.staff === 0 ? (
				<Card className="border-emerald-200/70 bg-emerald-50/70">
					<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-emerald-900">
								<Users className="h-4 w-4" />
								<p className="font-medium">Invite your first staff member</p>
							</div>
							<p className="text-sm text-emerald-900/80">
								Your academic session is live. The next best move is inviting a
								teacher or team lead into the workspace.
							</p>
						</div>
						<Button asChild>
							<Link href="/onboarding/invite-staff">Invite staff</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}
		</>
	);
}

export function DashboardStatsSkeleton() {
	return (
		<div data-summary-grid
			className="grid gap-4 sm:grid-cols-3"
			aria-label="Loading dashboard totals"
		>
			{statCards.map((stat) => (
				<Card key={stat.key}>
					<CardHeader data-summary-header>
						<CardTitle data-summary-label className="text-sm font-medium text-muted-foreground">
							{stat.title}
						</CardTitle>
					</CardHeader>
					<CardContent data-summary-body>
						<Skeleton className="h-9 w-20" />
						<Skeleton className="mt-2 h-4 w-16" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

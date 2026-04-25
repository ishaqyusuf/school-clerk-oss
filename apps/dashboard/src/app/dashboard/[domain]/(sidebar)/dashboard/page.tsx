import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { AddStudentQuickLink } from "@/components/dashboard/add-student-quick-link";
import { PromotionQuickLink } from "@/components/dashboard/promotion-quick-link";
import { ReceiveFeeButton } from "@/components/dashboard/receive-fee-button";
import { prisma } from "@school-clerk/db";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import {
	BookOpen,
	GraduationCap,
	School,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats(schoolId: string, sessionId: string) {
	const [students, staff, classes] = await Promise.all([
		prisma.students.count({
			where: {
				sessionForms: {
					some: {
						schoolSessionId: sessionId,
						deletedAt: null,
					},
				},
			},
		}),
		prisma.staffProfile.count({
			where: {
				termProfiles: {
					some: {
						schoolSessionId: sessionId,
						deletedAt: null,
					},
				},
			},
		}),
		prisma.classRoomDepartment.count({
			where: {
				classRoom: {
					schoolSessionId: sessionId,
				},
				deletedAt: null,
			},
		}),
	]);
	return { students, staff, classes };
}

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

const quickLinks = [
	{ label: "Academic", icon: BookOpen, href: "/academic" },
	{ label: "Finance", icon: Wallet, href: "/finance" },
	{ label: "Classes", icon: School, href: "/academic/classes" },
];

export default async function Page({ params }) {
	const { domain } = await params;
	const cookie = await getAuthCookie();
	const sessionId = cookie?.sessionId ?? "";
	const schoolId = cookie?.schoolId ?? "";
	const termTitle = cookie?.termTitle ?? "—";
	const sessionTitle = cookie?.sessionTitle ?? "—";

	const stats = sessionId
		? await getDashboardStats(schoolId, sessionId)
		: { students: 0, staff: 0, classes: 0 };

	const base = `/dashboard/${domain}`;

	return (
		<div className="space-y-8 py-4">
			<PageTitle>Dashboard</PageTitle>
			{/* Header */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
					{sessionTitle && (
						<Badge variant="outline" className="text-xs">
							{sessionTitle}
						</Badge>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					Current term:{" "}
					<span className="font-medium text-foreground">{termTitle}</span>
				</p>
			</div>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				{statCards.map((s) => (
					<Card key={s.key}>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{s.title}
							</CardTitle>
							<s.icon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-bold">{stats[s.key]}</p>
							<Link
								href={`${base}${s.href}`}
								className="mt-1 text-xs text-primary hover:underline"
							>
								View all →
							</Link>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Quick links */}
			<div>
				<h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
					Quick Links
				</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					<AddStudentQuickLink />
					{quickLinks.map((l) => (
						<Button
							key={l.label}
							variant="outline"
							className="h-auto flex-col gap-2 py-5"
							asChild
						>
							<Link href={`${l.href}`}>
								<l.icon className="h-5 w-5" />
								<span className="text-sm font-medium">{l.label}</span>
							</Link>
						</Button>
					))}
					<PromotionQuickLink />
					<ReceiveFeeButton />
				</div>
			</div>
		</div>
	);
}

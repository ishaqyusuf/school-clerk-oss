"use client";

import { Form } from "@/components/forms/staff-form";
import { FormContext } from "@/components/staffs/form-context";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@school-clerk/utils";
import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import { Separator } from "@school-clerk/ui/separator";
import { Skeleton } from "@school-clerk/ui/skeleton";
import {
	AlertTriangle,
	BookOpen,
	Clock3,
	GraduationCap,
	IdCard,
	Mail,
	MapPin,
	PencilLine,
	Phone,
	School,
	ShieldCheck,
	UserSquare2,
} from "lucide-react";

const tabs = [
	{ id: "overview", label: "Overview", icon: UserSquare2 },
	{ id: "assignments", label: "Assignments", icon: GraduationCap },
	{ id: "edit", label: "Edit profile", icon: PencilLine },
] as const;

type TabId = (typeof tabs)[number]["id"];

type Props = {
	staffId: string;
	mode?: "sheet" | "page";
	activeTab?: string | null;
	onTabChange?: (tab: TabId) => void;
};

function formatDate(value?: Date | string | null) {
	if (!value) return "Not available";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "Not available";

	return new Intl.DateTimeFormat("en-NG", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(date);
}

function onboardingTone(status?: string | null) {
	switch (status) {
		case "ACTIVE":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "FAILED":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "PENDING":
			return "border-amber-200 bg-amber-50 text-amber-700";
		default:
			return "border-border bg-muted text-muted-foreground";
	}
}

function onboardingLabel(status?: string | null) {
	switch (status) {
		case "ACTIVE":
			return "Active";
		case "FAILED":
			return "Invite failed";
		case "PENDING":
			return "Pending onboarding";
		default:
			return "Invite not sent";
	}
}

function iconTone(status?: string | null) {
	switch (status) {
		case "ACTIVE":
			return "bg-emerald-50 text-emerald-700";
		case "FAILED":
			return "bg-rose-50 text-rose-700";
		case "PENDING":
			return "bg-amber-50 text-amber-700";
		default:
			return "bg-primary/10 text-primary";
	}
}

export function StaffOverviewShell({
	staffId,
	mode = "sheet",
	activeTab,
	onTabChange,
}: Props) {
	const trpc = useTRPC();
	const { data, isLoading } = useQuery(
		trpc.staff.getFormData.queryOptions({
			staffId,
		}),
	);

	const resolvedTab = (activeTab as TabId | undefined) || "overview";

	if (isLoading) {
		return <StaffOverviewSkeleton mode={mode} />;
	}

	if (!data?.staff) {
		return (
			<Card className="rounded-2xl border-dashed">
				<CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center">
					<div className="rounded-full bg-muted p-3 text-muted-foreground">
						<UserSquare2 className="h-5 w-5" />
					</div>
					<div className="space-y-1">
						<p className="font-medium text-foreground">Staff profile not found</p>
						<p className="text-sm text-muted-foreground">
							This record may have been removed or is not available in the
							current school session.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const assignmentRows = (data.staff.assignments ?? []).map((assignment) => {
		const classroom = data.classrooms.find(
			(item) => item.value === assignment.classRoomDepartmentId,
		);
		const subjectMap = new Map(
			(data.subjectsByClassroom[assignment.classRoomDepartmentId] ?? []).map(
				(subject) => [subject.value, subject.label],
			),
		);
		return {
			classroomLabel: classroom?.label || "Classroom assignment",
			subjects: assignment.departmentSubjectIds
				.map((subjectId) => subjectMap.get(subjectId))
				.filter(Boolean) as string[],
		};
	});
	const totalSubjects = assignmentRows.reduce(
		(total, row) => total + row.subjects.length,
		0,
	);

	return (
		<div
			className={cn(
				"flex min-w-0 flex-col gap-6",
				mode === "page" && "mx-auto w-full max-w-7xl",
			)}
		>
			<section
				className={cn(
					"overflow-hidden rounded-3xl border border-border bg-card shadow-sm",
					mode === "page" ? "p-6 md:p-8" : "p-5",
				)}
			>
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
						<div className="relative">
							<Avatar className="h-20 w-20 border-4 border-background shadow-inner md:h-24 md:w-24">
								<AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
									{getInitials(data.staff.name || data.staff.email || "S")}
								</AvatarFallback>
							</Avatar>
							<span
								className={cn(
									"absolute bottom-1 right-1 rounded-full border-2 border-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
									onboardingTone(data.staff.onboardingStatus),
								)}
							>
								{onboardingLabel(data.staff.onboardingStatus)}
							</span>
						</div>

						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-3">
								<h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
									{data.staff.name || data.staff.email || "Pending staff"}
								</h2>
								<Badge
									variant="outline"
									className="border-primary/20 bg-primary/10 text-primary"
								>
									{data.staff.role}
								</Badge>
								{data.staff.title ? (
									<Badge variant="secondary">{data.staff.title}</Badge>
								) : null}
							</div>

							<p className="max-w-2xl text-sm text-muted-foreground">
								Manage onboarding, contact details, and classroom coverage from
								a single staff profile view modeled after the new AI Studio
								samples.
							</p>

							<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
								<div className="inline-flex items-center gap-2">
									<Mail className="h-4 w-4" />
									<span>{data.staff.email || "No email yet"}</span>
								</div>
								<div className="inline-flex items-center gap-2">
									<Phone className="h-4 w-4" />
									<span>{data.staff.phone || data.staff.phone2 || "No phone"}</span>
								</div>
								<div className="inline-flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									<span>{data.staff.address || "Address not added"}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="grid min-w-full gap-3 sm:min-w-80 sm:grid-cols-2 lg:min-w-96">
						<QuickInfoCard
							icon={School}
							label="Classrooms"
							value={String(assignmentRows.length)}
							helper={
								assignmentRows.length
									? `${totalSubjects} linked subject${
											totalSubjects === 1 ? "" : "s"
									  }`
									: "No active classroom assignments"
							}
						/>
						<QuickInfoCard
							icon={Clock3}
							label="Last invite"
							value={formatDate(
								data.staff.inviteResentAt || data.staff.inviteSentAt,
							)}
							helper="Most recent onboarding activity"
						/>
					</div>
				</div>
			</section>

			<div className="border-b border-border">
				<nav
					aria-label="Staff overview tabs"
					className="flex gap-6 overflow-x-auto scrollbar-hide"
				>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => onTabChange?.(tab.id)}
							className={cn(
								"inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors",
								resolvedTab === tab.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
							)}
						>
							<tab.icon className="h-4 w-4" />
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{resolvedTab === "overview" ? (
				<div className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							icon={IdCard}
							label="Staff ID"
							value={data.staff.id.slice(0, 8)}
							helper="Profile record"
						/>
						<MetricCard
							icon={ShieldCheck}
							label="Onboarding"
							value={onboardingLabel(data.staff.onboardingStatus)}
							helper={
								data.staff.onboardedAt
									? `Completed ${formatDate(data.staff.onboardedAt)}`
									: "Invite-based access setup"
							}
							iconClassName={iconTone(data.staff.onboardingStatus)}
						/>
						<MetricCard
							icon={School}
							label="Assignments"
							value={`${assignmentRows.length} classroom${
								assignmentRows.length === 1 ? "" : "s"
							}`}
							helper="Current teaching coverage"
						/>
						<MetricCard
							icon={BookOpen}
							label="Subjects"
							value={String(totalSubjects)}
							helper="Linked subject permissions"
						/>
					</div>

					<div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
						<Card className="rounded-2xl shadow-sm">
							<CardHeader>
								<CardTitle>Profile summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-5">
								<InfoRow
									icon={Mail}
									label="Primary email"
									value={data.staff.email || "No email saved"}
								/>
								<Separator />
								<InfoRow
									icon={Phone}
									label="Phone number"
									value={data.staff.phone || "No primary phone saved"}
									secondary={
										data.staff.phone2 ? `Alternate: ${data.staff.phone2}` : null
									}
								/>
								<Separator />
								<InfoRow
									icon={MapPin}
									label="Address"
									value={data.staff.address || "No address saved yet"}
								/>
							</CardContent>
						</Card>

						<Card className="rounded-2xl shadow-sm">
							<CardHeader>
								<CardTitle>Onboarding tracker</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<TimelineRow
									label="Invite sent"
									value={formatDate(data.staff.inviteSentAt)}
								/>
								<TimelineRow
									label="Invite resent"
									value={formatDate(data.staff.inviteResentAt)}
								/>
								<TimelineRow
									label="Activated"
									value={formatDate(data.staff.onboardedAt)}
								/>
								<div
									className={cn(
										"rounded-2xl border p-4 text-sm",
										data.staff.lastInviteError
											? "border-rose-200 bg-rose-50 text-rose-700"
											: "border-border bg-muted/40 text-muted-foreground",
									)}
								>
									<div className="flex items-start gap-3">
										<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
										<div>
											<p className="font-medium text-foreground">
												Invite health
											</p>
											<p className="mt-1">
												{data.staff.lastInviteError ||
													"No delivery issues recorded for the latest onboarding email."}
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			) : null}

			{resolvedTab === "assignments" ? (
				<div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
					<Card className="rounded-2xl shadow-sm">
						<CardHeader>
							<CardTitle>Classroom coverage</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{assignmentRows.length ? (
								assignmentRows.map((assignment, index) => (
									<div
										key={`${assignment.classroomLabel}-${index}`}
										className="rounded-2xl border border-border bg-background p-4"
									>
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<p className="font-medium text-foreground">
													{assignment.classroomLabel}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{assignment.subjects.length
														? `${assignment.subjects.length} assigned subject${
																assignment.subjects.length === 1 ? "" : "s"
														  }`
														: "No subjects linked for this classroom yet."}
												</p>
											</div>
											<Badge variant="secondary">
												{assignment.subjects.length} subject
												{assignment.subjects.length === 1 ? "" : "s"}
											</Badge>
										</div>
										<div className="mt-4 flex flex-wrap gap-2">
											{assignment.subjects.length ? (
												assignment.subjects.map((subject) => (
													<Badge key={subject} variant="outline">
														{subject}
													</Badge>
												))
											) : (
												<span className="text-sm text-muted-foreground">
													Waiting for subject mapping.
												</span>
											)}
										</div>
									</div>
								))
							) : (
								<div className="rounded-2xl border border-dashed p-8 text-center">
									<p className="font-medium text-foreground">
										No classroom assignments yet
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										Add classrooms and subjects from the edit tab to make this
										staff member operational.
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-sm">
						<CardHeader>
							<CardTitle>Coverage notes</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 text-sm text-muted-foreground">
							<div className="rounded-2xl border border-border bg-muted/30 p-4">
								<p className="font-medium text-foreground">Role access</p>
								<p className="mt-1">
									Only teaching staff can hold classroom and subject
									assignments. Non-teaching roles stay available for onboarding
									and directory management.
								</p>
							</div>
							<div className="rounded-2xl border border-border bg-background p-4">
								<p className="font-medium text-foreground">Current role</p>
								<p className="mt-1">{data.staff.role}</p>
							</div>
							<Button
								type="button"
								variant="outline"
								className="w-full"
								onClick={() => onTabChange?.("edit")}
							>
								Edit assignments
							</Button>
						</CardContent>
					</Card>
				</div>
			) : null}

			{resolvedTab === "edit" ? (
				<Card className="rounded-2xl shadow-sm">
					<CardHeader className="gap-2">
						<CardTitle>Edit staff profile</CardTitle>
						<p className="text-sm text-muted-foreground">
							Update invite details, role access, and classroom assignments
							using the same form in both the full page and the quick-view
							sheet.
						</p>
					</CardHeader>
					<CardContent>
						<FormContext values={data.staff}>
							<Form staffId={data.staff.id} submitLabel="Save changes" />
						</FormContext>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

function QuickInfoCard({
	icon: Icon,
	label,
	value,
	helper,
}: {
	icon: typeof School;
	label: string;
	value: string;
	helper: string;
}) {
	return (
		<div className="rounded-2xl border border-border bg-muted/30 p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						{label}
					</p>
					<p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
				</div>
				<div className="rounded-xl bg-background p-2 text-primary shadow-sm">
					<Icon className="h-4 w-4" />
				</div>
			</div>
			<p className="mt-2 text-sm text-muted-foreground">{helper}</p>
		</div>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
	helper,
	iconClassName,
}: {
	icon: typeof School;
	label: string;
	value: string;
	helper: string;
	iconClassName?: string;
}) {
	return (
		<Card className="rounded-2xl shadow-sm">
			<CardContent className="p-5">
				<div className="mb-3 flex items-center gap-3">
					<div
						className={cn(
							"flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary",
							iconClassName,
						)}
					>
						<Icon className="h-5 w-5" />
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							{label}
						</p>
						<p className="text-sm font-bold text-foreground">{value}</p>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">{helper}</p>
			</CardContent>
		</Card>
	);
}

function InfoRow({
	icon: Icon,
	label,
	value,
	secondary,
}: {
	icon: typeof Mail;
	label: string;
	value: string;
	secondary?: string | null;
}) {
	return (
		<div className="flex items-start gap-3">
			<div className="rounded-xl bg-primary/10 p-2 text-primary">
				<Icon className="h-4 w-4" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium text-foreground">{label}</p>
				<p className="text-sm text-muted-foreground">{value}</p>
				{secondary ? <p className="text-xs text-muted-foreground">{secondary}</p> : null}
			</div>
		</div>
	);
}

function TimelineRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
			<span className="text-sm font-medium text-foreground">{label}</span>
			<span className="text-sm text-muted-foreground">{value}</span>
		</div>
	);
}

function StaffOverviewSkeleton({ mode = "sheet" }: { mode?: "sheet" | "page" }) {
	return (
		<div
			className={cn(
				"flex flex-col gap-6",
				mode === "page" && "mx-auto w-full max-w-7xl",
			)}
		>
			<div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-4">
						<Skeleton className="h-24 w-24 rounded-full" />
						<div className="space-y-3">
							<Skeleton className="h-8 w-56" />
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-4 w-80" />
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<Skeleton className="h-24 w-full sm:w-44" />
						<Skeleton className="h-24 w-full sm:w-44" />
					</div>
				</div>
			</div>
			<div className="flex gap-4 border-b border-border pb-3">
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-28" />
				<Skeleton className="h-8 w-28" />
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Skeleton key={index} className="h-28 w-full rounded-2xl" />
				))}
			</div>
			<div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
				<Skeleton className="h-80 w-full rounded-2xl" />
				<Skeleton className="h-80 w-full rounded-2xl" />
			</div>
		</div>
	);
}

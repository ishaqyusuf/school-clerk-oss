"use client";

import { Form } from "@/components/forms/staff-form";
import { FormContext } from "@/components/staffs/form-context";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Separator } from "@school-clerk/ui/separator";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { getInitials } from "@school-clerk/utils";
import { useQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	Banknote,
	BookOpen,
	Clock3,
	GraduationCap,
	IdCard,
	Mail,
	MapPin,
	PencilLine,
	Phone,
	ReceiptText,
	School,
	ShieldCheck,
	UserSquare2,
} from "lucide-react";

const tabs = [
	{ id: "overview", label: "Overview", icon: UserSquare2 },
	{ id: "assignments", label: "Assignments", icon: GraduationCap },
	{ id: "finance", label: "Finance", icon: Banknote },
	{ id: "edit", label: "Edit profile", icon: PencilLine },
] as const;
const metricSkeletonKeys = [
	"staff-id",
	"onboarding",
	"assignments",
	"subjects",
];

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

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		maximumFractionDigits: 0,
	}).format(value ?? 0);
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
	const { data: financeHistory, isLoading: isFinanceHistoryLoading } = useQuery(
		trpc.finance.getStaffFinanceHistory.queryOptions(
			{
				staffProfileId: staffId,
				termId: null,
				sessionId: null,
			},
			{ enabled: Boolean(data?.staff) },
		),
	);

	const resolvedTab = (activeTab as TabId | undefined) || "overview";

	if (isLoading) {
		return <StaffOverviewSkeleton mode={mode} />;
	}

	if (!data?.staff) {
		return (
			<section className="flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed p-10 text-center">
				<div className="rounded-full bg-muted p-3 text-muted-foreground">
					<UserSquare2 className="h-5 w-5" />
				</div>
				<div className="space-y-1">
					<p className="font-medium text-foreground">Staff profile not found</p>
					<p className="text-sm text-muted-foreground">
						This record may have been removed or is not available in the current
						school session.
					</p>
				</div>
			</section>
		);
	}

	const assignmentRows = (data.staff.assignments ?? []).map((assignment) => {
		const scope = assignment.scope ?? "DEPARTMENT";
		const classOption = data.classes?.find(
			(item) => item.value === assignment.classRoomId,
		);
		const subjectOption =
			(data.subjectsByClass?.[assignment.classRoomId ?? ""] ?? data.subjects ?? []).find(
				(item) => item.value === assignment.subjectId,
			);
		const classroom = data.classrooms.find(
			(item) => item.value === assignment.classRoomDepartmentId,
		);
		const classroomSubjects =
			data.subjectsByClassroom[assignment.classRoomDepartmentId] ?? [];
		const subjectMap = new Map(
			classroomSubjects.map((subject) => [subject.value, subject.label]),
		);
		const grantsAllSubjects = assignment.subjectAccessMode === "ALL";

		if (scope === "CLASS") {
			return {
				classroomLabel: classOption?.label || "Class assignment",
				grantsAllSubjects: true,
				scopeLabel: "Whole class",
				subjects: ["All current and future departments and subjects"],
			};
		}

		if (scope === "CLASS_SUBJECT") {
			return {
				classroomLabel: classOption?.label || "Class assignment",
				grantsAllSubjects: false,
				scopeLabel: "Subject across class",
				subjects: [subjectOption?.label || "Selected subject"],
			};
		}

		return {
			classroomLabel: classroom?.label || "Classroom assignment",
			grantsAllSubjects,
			scopeLabel: "Department/arm",
			subjects: grantsAllSubjects
				? classroomSubjects.map((subject) => subject.label)
				: (assignment.departmentSubjectIds
						.map((subjectId) => subjectMap.get(subjectId))
						.filter(Boolean) as string[]),
		};
	});
	const totalSubjects = assignmentRows.reduce(
		(total, row) => total + row.subjects.length,
		0,
	);
	const effectiveClassroomCount =
		data.staff.effectiveClassroomCount ?? assignmentRows.length;
	const effectiveSubjectCount =
		data.staff.effectiveSubjectCount ?? totalSubjects;

	return (
		<div
			className={cn(
				"flex min-w-0 flex-col gap-6",
				mode === "page" && "mx-auto w-full max-w-7xl",
			)}
		>
			<section
				className={cn(
					"border-b bg-background",
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
									<span>
										{data.staff.phone || data.staff.phone2 || "No phone"}
									</span>
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
							value={String(effectiveClassroomCount)}
							helper={
								effectiveClassroomCount
									? `${effectiveSubjectCount} linked subject${
											effectiveSubjectCount === 1 ? "" : "s"
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
					<div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
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
							value={`${effectiveClassroomCount} classroom${
								effectiveClassroomCount === 1 ? "" : "s"
							}`}
							helper="Current teaching coverage"
						/>
						<MetricCard
							icon={BookOpen}
							label="Subjects"
							value={String(effectiveSubjectCount)}
							helper="Linked subject permissions"
						/>
					</div>

					<div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
						<section className="border bg-background">
							<div className="border-b px-4 py-4 sm:px-5">
								<h3 className="text-base font-semibold">Profile summary</h3>
							</div>
							<div className="space-y-5 p-4 sm:p-5">
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
							</div>
						</section>

						<section className="border bg-background">
							<div className="border-b px-4 py-4 sm:px-5">
								<h3 className="text-base font-semibold">Onboarding tracker</h3>
							</div>
							<div className="space-y-4 p-4 sm:p-5">
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
										"border p-4 text-sm",
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
							</div>
						</section>
					</div>
				</div>
			) : null}

			{resolvedTab === "assignments" ? (
				<div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
					<section className="border bg-background">
						<div className="border-b px-4 py-4 sm:px-5">
							<h3 className="text-base font-semibold">Classroom coverage</h3>
						</div>
						<div className="space-y-4 p-4 sm:p-5">
							{assignmentRows.length ? (
								assignmentRows.map((assignment, index) => (
									<div
										key={`${assignment.classroomLabel}-${index}`}
										className="border-l pl-4"
									>
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<p className="font-medium text-foreground">
													{assignment.classroomLabel}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{assignment.grantsAllSubjects
														? `${assignment.subjects.length} current subject${
																assignment.subjects.length === 1 ? "" : "s"
															}; future subjects included`
														: assignment.subjects.length
														? `${assignment.subjects.length} assigned subject${
																assignment.subjects.length === 1 ? "" : "s"
															}`
														: "No subjects linked for this classroom yet."}
												</p>
											</div>
											<Badge variant={assignment.grantsAllSubjects ? "outline" : "secondary"}>
												{assignment.scopeLabel === "Whole class" ||
												assignment.scopeLabel === "Subject across class"
													? assignment.scopeLabel
													: assignment.grantsAllSubjects
													? "All subjects"
													: `${assignment.subjects.length} subject${
															assignment.subjects.length === 1 ? "" : "s"
														}`}
											</Badge>
										</div>
										<div className="mt-4 flex flex-wrap gap-2">
											{assignment.subjects.length ? (
												assignment.subjects.map((subject, subjectIndex) => (
													<Badge
														key={`${assignment.classroomLabel}-${subject}-${subjectIndex}`}
														variant="outline"
													>
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
								<div className="border border-dashed p-8 text-center">
									<p className="font-medium text-foreground">
										No classroom assignments yet
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										Add classrooms and subjects from the edit tab to make this
										staff member operational.
									</p>
								</div>
							)}
						</div>
					</section>

					<section className="border bg-background">
						<div className="border-b px-4 py-4 sm:px-5">
							<h3 className="text-base font-semibold">Coverage notes</h3>
						</div>
						<div className="space-y-4 p-4 text-sm text-muted-foreground sm:p-5">
							<div className="border border-border bg-muted/30 p-4">
								<p className="font-medium text-foreground">Role access</p>
								<p className="mt-1">
									Only teaching staff can hold classroom and subject
									assignments. Non-teaching roles stay available for onboarding
									and directory management.
								</p>
							</div>
							<div className="border border-border bg-background p-4">
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
						</div>
					</section>
				</div>
			) : null}

			{resolvedTab === "finance" ? (
				<div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
					<section className="border bg-background">
						<div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
							<div>
								<h3 className="text-base font-semibold">Payroll history</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									Salary and wage obligations linked to this staff profile.
								</p>
							</div>
							<Badge variant="outline">
								{financeHistory?.summary.chargeCount ?? 0} record
								{financeHistory?.summary.chargeCount === 1 ? "" : "s"}
							</Badge>
						</div>
						<div className="space-y-4 p-4 sm:p-5">
							{isFinanceHistoryLoading ? (
								<div className="space-y-3">
									<Skeleton className="h-20 w-full" />
									<Skeleton className="h-20 w-full" />
								</div>
							) : financeHistory?.charges.length ? (
								financeHistory.charges.map((charge) => (
									<div key={charge.id} className="border p-4">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-medium text-foreground">
														{charge.title}
													</p>
													<Badge variant="secondary">{charge.status}</Badge>
												</div>
												<p className="mt-1 text-sm text-muted-foreground">
													{charge.stream.name}
													{charge.payrollStructure
														? ` · ${charge.payrollStructure.cadence.toLowerCase()}`
														: ""}
												</p>
											</div>
											<div className="text-left sm:text-right">
												<p className="font-semibold text-foreground">
													{formatCurrency(charge.amount)}
												</p>
												<p className="text-sm text-muted-foreground">
													{formatCurrency(charge.outstanding)} outstanding
												</p>
											</div>
										</div>
										{charge.receipts.length ? (
											<div className="mt-4 space-y-2 border-t pt-3">
												{charge.receipts.map((receipt) => (
													<div
														key={receipt.id}
														className="flex items-center justify-between gap-3 text-sm"
													>
														<div className="flex items-center gap-2 text-muted-foreground">
															<ReceiptText className="h-4 w-4" />
															<span>{receipt.reference || receipt.method || "Receipt"}</span>
														</div>
														<span className="font-medium text-foreground">
															{formatCurrency(receipt.amount)}
														</span>
													</div>
												))}
											</div>
										) : null}
									</div>
								))
							) : (
								<div className="border border-dashed p-8 text-center">
									<p className="font-medium text-foreground">
										No finance records yet
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										Salary, wage, advance, deduction, and payment records will
										appear here once recorded from payroll.
									</p>
								</div>
							)}
						</div>
					</section>

					<section className="border bg-background">
						<div className="border-b px-4 py-4 sm:px-5">
							<h3 className="text-base font-semibold">Salary structure</h3>
						</div>
						<div className="space-y-4 p-4 sm:p-5">
							<div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
								<FinanceMetric
									label="Total due"
									value={financeHistory?.summary.totalDue ?? 0}
								/>
								<FinanceMetric
									label="Paid"
									value={financeHistory?.summary.totalPaid ?? 0}
								/>
								<FinanceMetric
									label="Outstanding"
									value={financeHistory?.summary.totalOutstanding ?? 0}
								/>
							</div>

							{financeHistory?.payrollStructures.length ? (
								<div className="space-y-3">
									{financeHistory.payrollStructures.map((structure) => (
										<div key={structure.id} className="border bg-muted/20 p-4">
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="font-medium text-foreground">
														{structure.title}
													</p>
													<p className="mt-1 text-sm text-muted-foreground">
														{structure.cadence.toLowerCase()} ·{" "}
														{structure.stream.name}
													</p>
												</div>
												<Badge variant={structure.isActive ? "success" : "secondary"}>
													{structure.isActive ? "Active" : "Inactive"}
												</Badge>
											</div>
											<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
												<AmountLine label="Base" value={structure.baseAmount} />
												<AmountLine label="Allowance" value={structure.allowanceAmount} />
												<AmountLine label="Bonus" value={structure.bonusAmount} />
												<AmountLine label="Deductions" value={structure.deductionAmount + structure.advanceAmount} />
											</div>
											<div className="mt-4 border-t pt-3">
												<div className="flex items-center justify-between gap-3">
													<span className="text-sm font-medium text-muted-foreground">
														Net amount
													</span>
													<span className="font-semibold text-foreground">
														{formatCurrency(structure.netAmount)}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No reusable salary or wage structure has been saved for this
									staff member.
								</p>
							)}
						</div>
					</section>
				</div>
			) : null}

			{resolvedTab === "edit" ? (
				<section className="border bg-background">
					<div className="space-y-2 border-b px-4 py-4 sm:px-5">
						<h3 className="text-base font-semibold">Edit staff profile</h3>
						<p className="text-sm text-muted-foreground">
							Update invite details, role access, and classroom assignments
							using the same form in both the full page and the quick-view
							sheet.
						</p>
					</div>
					<div className="p-4 sm:p-5">
						<FormContext values={data.staff}>
							<Form staffId={data.staff.id} submitLabel="Save changes" />
						</FormContext>
					</div>
				</section>
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
		<div className="border border-border bg-muted/30 p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						{label}
					</p>
					<p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
				</div>
				<div className="bg-background p-2 text-primary">
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
		<div className="border-y bg-background px-4 py-4">
			<div className="mb-3 flex items-center gap-3">
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center bg-primary/10 text-primary",
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
		</div>
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
			<div className="bg-primary/10 p-2 text-primary">
				<Icon className="h-4 w-4" />
			</div>
			<div className="space-y-1">
				<p className="text-sm font-medium text-foreground">{label}</p>
				<p className="text-sm text-muted-foreground">{value}</p>
				{secondary ? (
					<p className="text-xs text-muted-foreground">{secondary}</p>
				) : null}
			</div>
		</div>
	);
}

function TimelineRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 border border-border bg-background px-4 py-3">
			<span className="text-sm font-medium text-foreground">{label}</span>
			<span className="text-sm text-muted-foreground">{value}</span>
		</div>
	);
}

function FinanceMetric({ label, value }: { label: string; value: number }) {
	return (
		<div className="border bg-muted/20 p-4">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-lg font-semibold text-foreground">
				{formatCurrency(value)}
			</p>
		</div>
	);
}

function AmountLine({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-foreground">{formatCurrency(value)}</span>
		</div>
	);
}

function StaffOverviewSkeleton({
	mode = "sheet",
}: { mode?: "sheet" | "page" }) {
	return (
		<div
			className={cn(
				"flex flex-col gap-6",
				mode === "page" && "mx-auto w-full max-w-7xl",
			)}
		>
			<div className="border-b bg-background p-6">
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
			<div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
				{metricSkeletonKeys.map((key) => (
					<Skeleton key={key} className="h-28 w-full" />
				))}
			</div>
			<div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
				<Skeleton className="h-80 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</div>
	);
}

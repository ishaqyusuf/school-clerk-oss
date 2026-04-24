"use client";

import { resendStaffOnboardingAction } from "@/actions/save-staff";
import { staffPageQuery } from "@/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { getInitials } from "@school-clerk/utils";
import { useAction } from "next-safe-action/hooks";
import { usePathname, useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";

import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-clerk/ui/table";
import {
	AlertTriangle,
	Clock3,
	School,
	ShieldCheck,
	Users2,
} from "lucide-react";

type Props = {
	search?: string | null;
	status?: string | null;
};

const STATUS_OPTIONS = [
	{ label: "All staff", value: "all" },
	{ label: "Pending onboarding", value: "pending" },
	{ label: "Active", value: "active" },
	{ label: "Invite failed", value: "failed" },
] as const;

function formatDate(value?: Date | string | null) {
	if (!value) return "—";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat("en-NG", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(date);
}

function statusBadgeVariant(status: string) {
	switch (status) {
		case "ACTIVE":
			return "default";
		case "FAILED":
			return "destructive";
		default:
			return "secondary";
	}
}

function statusLabel(status: string) {
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

export function DataTable({ search, status }: Props) {
	const { setParams } = useStaffParams();
	const router = useRouter();
	const pathname = usePathname();
	const [, setFilters] = useQueryStates(staffPageQuery, {
		shallow: false,
	});
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const qc = useQueryClient();
	const activeStatus = status || "all";
	const queryInput = {
		...(search ? { q: search } : {}),
		...(activeStatus && activeStatus !== "all"
			? { status: activeStatus as "pending" | "active" | "failed" }
			: {}),
	};
	const { data } = useSuspenseQuery(
		trpc.staff.getStaffList.queryOptions(queryInput),
	);
	const { mutate: deleteStaff } = useMutation(
		trpc.staff.deleteStaff.mutationOptions({
			onSuccess() {
				toast.success("Staff removed.");
				qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });
			},
			onError() {
				toast.error("Could not remove staff.");
			},
		}),
	);

	const resendInvite = useAction(resendStaffOnboardingAction, {
		onSuccess() {
			toast.success("Onboarding email resent.");
			qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });
		},
		onError({ error }) {
			toast.error(error.serverError || "Could not resend onboarding email.");
		},
	});

	const staffBasePath = pathname.split("/").slice(0, -1).join("/");
	const openOverviewPage = (staffId: string) =>
		router.push(`${staffBasePath}/${staffId}`);

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Total staff"
					value={data.stats.total}
					helper="People records in this school workspace"
					icon={Users2}
				/>
				<StatCard
					label="Pending onboardings"
					value={data.stats.pending}
					helper="Staff still waiting to complete sign-in"
					icon={Clock3}
				/>
				<StatCard
					label="Active staff"
					value={data.stats.active}
					helper="Accounts with completed onboarding"
					icon={ShieldCheck}
				/>
				<StatCard
					label="Teachers needing assignments"
					value={data.stats.teachersNeedingAssignments}
					helper="Teachers missing classroom or subject coverage"
					icon={AlertTriangle}
				/>
			</div>

			<Card className="overflow-hidden rounded-3xl border-border shadow-sm">
				<CardHeader className="gap-4">
					<div className="rounded-2xl border border-border bg-muted/25 p-5">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<div className="space-y-2">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
									<School className="h-3.5 w-3.5" />
									Staff directory
								</div>
								<CardTitle className="text-2xl tracking-tight">
									Staff directory and overview hub
								</CardTitle>
								<p className="max-w-2xl text-sm text-muted-foreground">
									Use the redesigned directory to jump into the full overview
									page, keep onboarding healthy, and quickly open the sheet for
									in-context edits.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									onClick={() =>
										setFilters({
											status: "pending",
										})
									}
								>
									Review pending invites
								</Button>
								<Button
									onClick={() =>
										setParams({
											createStaff: true,
										})
									}
								>
									Invite staff
								</Button>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								Search, filter, and launch profiles
							</p>
							<p className="text-sm text-muted-foreground">
								The overview page opens full-width, while quick view keeps the
								same experience inside a sheet.
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<MiddaySearchFilter
							placeholder="Search by name or email"
							filterSchema={staffPageQuery}
						/>
						<div className="flex flex-wrap gap-2">
							{STATUS_OPTIONS.map((option) => (
								<Button
									key={option.value}
									type="button"
									size="sm"
									variant={
										activeStatus === option.value ? "default" : "outline"
									}
									onClick={() =>
										setFilters({
											status: option.value === "all" ? null : option.value,
										})
									}
								>
									{option.label}
								</Button>
							))}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{!data.items.length ? (
						<div className="rounded-xl border border-dashed p-8 text-center">
							<p className="text-sm font-medium">No staff found</p>
							<p className="mt-2 text-sm text-muted-foreground">
								Try a different search or invite a new staff member to get
								started.
							</p>
						</div>
					) : (
						<>
							<div className="hidden overflow-hidden rounded-xl border md:block">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Staff</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Onboarding</TableHead>
											<TableHead>Assignments</TableHead>
											<TableHead>Last invite</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.items.map((item) => (
											<TableRow key={item.id} className="hover:bg-muted/20">
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="h-11 w-11 border border-border">
															<AvatarFallback className="bg-primary/10 font-semibold text-primary">
																{getInitials(
																	item.name || item.email || "Staff",
																)}
															</AvatarFallback>
														</Avatar>
														<div className="space-y-1">
															<div className="font-medium">
																{item.name || item.email || "Pending staff"}
															</div>
															<div className="text-sm text-muted-foreground">
																{item.email || "No email"}
															</div>
															{item.title ? (
																<div className="text-xs text-muted-foreground">
																	{item.title}
																</div>
															) : null}
														</div>
													</div>
												</TableCell>
												<TableCell>
													<Badge variant="outline">{item.role}</Badge>
												</TableCell>
												<TableCell>
													<div className="space-y-2">
														<Badge
															variant={statusBadgeVariant(
																item.onboardingStatus,
															)}
														>
															{statusLabel(item.onboardingStatus)}
														</Badge>
														{item.lastInviteError ? (
															<p className="max-w-xs text-xs text-red-600">
																{item.lastInviteError}
															</p>
														) : null}
													</div>
												</TableCell>
												<TableCell>
													<div className="space-y-1 text-sm">
														<div>
															{item.classroomCount} classroom
															{item.classroomCount === 1 ? "" : "s"} ·{" "}
															{item.subjectCount} subject
															{item.subjectCount === 1 ? "" : "s"}
														</div>
														<div className="max-w-sm text-muted-foreground">
															{item.classroomLabels.slice(0, 2).join(", ") ||
																"—"}
														</div>
													</div>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{formatDate(item.inviteResentAt || item.inviteSentAt)}
												</TableCell>
												<TableCell>
													<div className="flex justify-end gap-2">
														<Button
															size="sm"
															onClick={() => openOverviewPage(item.id)}
														>
															Overview
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																setParams({
																	staffViewId: item.id,
																})
															}
														>
															Quick view
														</Button>
														{item.canResend ? (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	resendInvite.execute({ staffId: item.id })
																}
																disabled={resendInvite.isExecuting}
															>
																Resend
															</Button>
														) : null}
														<Button
															size="sm"
															variant="ghost"
															onClick={() => deleteStaff({ staffId: item.id })}
														>
															Remove
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							<div className="grid gap-4 md:hidden">
								{data.items.map((item) => (
									<Card key={item.id} className="border shadow-sm">
										<CardContent className="space-y-4 p-4">
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-start gap-3">
													<Avatar className="h-11 w-11 border border-border">
														<AvatarFallback className="bg-primary/10 font-semibold text-primary">
															{getInitials(
																item.name || item.email || "Staff",
															)}
														</AvatarFallback>
													</Avatar>
													<div className="space-y-1">
														<p className="font-medium">
															{item.name || item.email || "Pending staff"}
														</p>
														<p className="text-sm text-muted-foreground">
															{item.email || "No email"}
														</p>
														{item.title ? (
															<p className="text-xs text-muted-foreground">
																{item.title}
															</p>
														) : null}
													</div>
												</div>
												<Badge variant="outline">{item.role}</Badge>
											</div>

											<div className="flex flex-wrap gap-2">
												<Badge
													variant={statusBadgeVariant(item.onboardingStatus)}
												>
													{statusLabel(item.onboardingStatus)}
												</Badge>
												<Badge variant="secondary">
													{item.classroomCount} classroom
													{item.classroomCount === 1 ? "" : "s"}
												</Badge>
												<Badge variant="secondary">
													{item.subjectCount} subject
													{item.subjectCount === 1 ? "" : "s"}
												</Badge>
											</div>

											<div className="space-y-2 text-sm">
												<MetaRow
													label="Assignments"
													value={
														item.classroomLabels.join(", ") || "Not assigned"
													}
												/>
												<MetaRow
													label="Last invite"
													value={formatDate(
														item.inviteResentAt || item.inviteSentAt,
													)}
												/>
												{item.lastInviteError ? (
													<p className="text-red-600">{item.lastInviteError}</p>
												) : null}
											</div>

											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													onClick={() => openOverviewPage(item.id)}
												>
													Overview
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														setParams({
															staffViewId: item.id,
														})
													}
												>
													Quick view
												</Button>
												{item.canResend ? (
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															resendInvite.execute({ staffId: item.id })
														}
														disabled={resendInvite.isExecuting}
													>
														Resend invite
													</Button>
												) : null}
												<Button
													size="sm"
													variant="ghost"
													onClick={() => deleteStaff({ staffId: item.id })}
												>
													Remove
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({
	label,
	value,
	helper,
	icon: Icon,
}: {
	label: string;
	value: number;
	helper: string;
	icon: typeof Users2;
}) {
	return (
		<Card className="rounded-2xl border-border shadow-sm">
			<CardHeader className="flex flex-row items-start justify-between pb-2">
				<div className="space-y-1">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{label}
					</CardTitle>
					<p className="text-xs text-muted-foreground">{helper}</p>
				</div>
				<div className="rounded-xl bg-primary/10 p-2 text-primary">
					<Icon className="h-4 w-4" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-semibold">{value}</div>
			</CardContent>
		</Card>
	);
}

function MetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<span>{value}</span>
		</div>
	);
}

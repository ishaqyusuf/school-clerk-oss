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
import { useAction } from "next-safe-action/hooks";
import { useQueryStates } from "nuqs";

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

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard label="Total staff" value={data.stats.total} />
				<StatCard label="Pending onboardings" value={data.stats.pending} />
				<StatCard label="Active staff" value={data.stats.active} />
				<StatCard
					label="Teachers needing assignments"
					value={data.stats.teachersNeedingAssignments}
				/>
			</div>

			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-1">
							<CardTitle>Staff directory</CardTitle>
							<p className="text-sm text-muted-foreground">
								Manage pending onboarding, resend invite emails, and review
								classroom or subject coverage from one place.
							</p>
						</div>
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
											<TableRow key={item.id}>
												<TableCell>
													<div className="space-y-1">
														<div className="font-medium">
															{item.name || item.email || "Pending staff"}
														</div>
														<div className="text-sm text-muted-foreground">
															{item.email || "No email"}
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
															variant="outline"
															onClick={() =>
																setParams({
																	staffViewId: item.id,
																})
															}
														>
															Open
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
									<Card key={item.id} className="border">
										<CardContent className="space-y-4 p-4">
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<p className="font-medium">
														{item.name || item.email || "Pending staff"}
													</p>
													<p className="text-sm text-muted-foreground">
														{item.email || "No email"}
													</p>
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
													variant="outline"
													onClick={() =>
														setParams({
															staffViewId: item.id,
														})
													}
												>
													Open
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

function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{label}
				</CardTitle>
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

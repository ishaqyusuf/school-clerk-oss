"use client";

import {
	copyStaffOnboardingLinkAction,
	resendStaffOnboardingAction,
} from "@/actions/save-staff";
import { staffPageQuery } from "@/app/[domain]/(sidebar)/staff/teachers/search-params";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { getInitials } from "@school-clerk/utils";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { usePathname } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
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
	Copy,
	School,
	ShieldCheck,
	Users2,
	X,
} from "lucide-react";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";

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

async function copyTextToClipboard(text: string) {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fall through to the textarea fallback for browsers that expose the
			// Clipboard API but deny writes outside a focused/secure context.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.top = "0";
	document.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	try {
		return document.execCommand("copy");
	} finally {
		document.body.removeChild(textarea);
	}
}

export function DataTable({ search, status }: Props) {
	const academicDataDirection = useAcademicDataDirection();
	const { setParams } = useStaffParams();
	const router = useRouter();
	const pathname = usePathname();
	const [, setFilters] = useQueryStates(staffPageQuery, {
		shallow: false,
	});
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const qc = useQueryClient();
	const [manualInviteLink, setManualInviteLink] = useState<string | null>(null);
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

	async function showInviteLink(
		inviteLink: string,
		copy: {
			copiedTitle: string;
			readyTitle: string;
			readyDescription: string;
		} = {
			copiedTitle: "Onboarding link copied.",
			readyTitle: "Onboarding link ready",
			readyDescription: "Use the link field above the table to copy it.",
		},
	) {
		try {
			const copied = await copyTextToClipboard(inviteLink);

			if (copied) {
				setManualInviteLink(null);
				toast.success(copy.copiedTitle);
				return;
			}
		} catch {
			// The manual link field below is the fallback for browsers that block
			// clipboard writes.
		}

		setManualInviteLink(inviteLink);
		toast.display({
			title: copy.readyTitle,
			description: copy.readyDescription,
			duration: 6000,
		});
	}

	const resendInvite = useAction(resendStaffOnboardingAction, {
		async onSuccess({ data }) {
			qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });

			if (data && "inviteLink" in data && data.inviteLink) {
				await showInviteLink(data.inviteLink, {
					copiedTitle: "Onboarding link copied. Email was not sent.",
					readyTitle: "Email not sent",
					readyDescription:
						"Use the link field above the table while local email delivery is not configured.",
				});
				return;
			}

			toast.success("Onboarding email resent.");
		},
		onError({ error }) {
			toast.error(error.serverError || "Could not resend onboarding email.");
		},
	});

	const copyInviteLink = useAction(copyStaffOnboardingLinkAction, {
		async onSuccess({ data }) {
			if (!data?.inviteLink) {
				toast.error("Could not generate onboarding link.");
				return;
			}

			qc.invalidateQueries({
				queryKey: trpc.staff.getStaffList.queryKey(),
			});

			await showInviteLink(data.inviteLink);
		},
		onError({ error }) {
			toast.error(error.serverError || "Could not create onboarding link.");
		},
	});

	const staffBasePath = pathname.split("/").slice(0, -1).join("/");
	const openOverviewPage = (staffId: string) =>
		router.push(`${staffBasePath}/${staffId}`);

	return (
		<div className="flex flex-col gap-4">
			<div className="hidden border-y bg-muted/20 md:grid md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Total staff"
					value={data.stats.total}
					helper="People records"
					icon={Users2}
				/>
				<StatCard
					label="Pending onboardings"
					value={data.stats.pending}
					helper="Waiting to complete sign-in"
					icon={Clock3}
				/>
				<StatCard
					label="Active staff"
					value={data.stats.active}
					helper="Completed onboarding"
					icon={ShieldCheck}
				/>
				<StatCard
					label="Teachers needing assignments"
					value={data.stats.teachersNeedingAssignments}
					helper="Missing classroom or subject coverage"
					icon={AlertTriangle}
				/>
			</div>

			<section className="border-y bg-background">
				<div className="space-y-4 border-b bg-muted/10 px-4 py-4 sm:px-5">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="space-y-2">
							<div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
								<School className="h-3.5 w-3.5" />
								Staff directory
							</div>
							<h2 className="text-xl font-semibold tracking-tight">
								Staff directory
							</h2>
							<p className="max-w-2xl text-sm text-muted-foreground">
								Manage staff records, onboarding, and teacher assignments from
								one flat directory.
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

					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								Search and filter
							</p>
							<p className="text-sm text-muted-foreground">
								Open the overview page for full records or quick view for a
								side-panel edit.
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
				</div>

				<div className="space-y-4 p-4 sm:p-5">
					{manualInviteLink ? (
						<div className="flex flex-col gap-3 border-y bg-muted/20 p-3 sm:flex-row sm:items-end">
							<div className="min-w-0 flex-1 space-y-2">
								<p className="text-sm font-medium">Onboarding link ready</p>
								<Input
									readOnly
									value={manualInviteLink}
									onFocus={(event) => event.currentTarget.select()}
									className="font-mono text-xs"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={async () => {
										const copied = await copyTextToClipboard(manualInviteLink);

										if (copied) {
											setManualInviteLink(null);
											toast.success("Onboarding link copied.");
											return;
										}

										toast.error("Select and copy the link manually.");
									}}
								>
									<Copy className="mr-1.5 size-3.5" />
									Copy
								</Button>
								<Button
									type="button"
									size="icon"
									variant="ghost"
									aria-label="Close onboarding link"
									onClick={() => setManualInviteLink(null)}
								>
									<X className="size-4" />
								</Button>
							</div>
						</div>
					) : null}
					{!data.items.length ? (
						<div className="border-y border-dashed bg-muted/10 p-8 text-center">
							<p className="text-sm font-medium">No staff found</p>
							<p className="mt-2 text-sm text-muted-foreground">
								Try a different search or invite a new staff member to get
								started.
							</p>
						</div>
					) : (
						<>
							<div
								className="hidden overflow-hidden border-y md:block"
								dir={academicDataDirection}
							>
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
											<TableRow key={item.id} className="hover:bg-muted/30">
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="h-10 w-10">
															<AvatarFallback className="bg-muted font-semibold text-foreground">
																{getInitials(
																	item.name || item.email || "Staff",
																)}
															</AvatarFallback>
														</Avatar>
														<div className="space-y-1">
															<div className="font-medium" dir="auto">
																{item.name || item.email || "Pending staff"}
															</div>
															<div className="text-sm text-muted-foreground">
																{item.email || "No email"}
															</div>
															{item.title ? (
																<div
																	className="text-xs text-muted-foreground"
																	dir="auto"
																>
																	{item.title}
																</div>
															) : null}
														</div>
													</div>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">{item.role}</Badge>
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
														<div
															className="max-w-sm text-muted-foreground"
															dir="auto"
														>
															{item.classroomLabels.slice(0, 2).join(", ") ||
																"—"}
														</div>
													</div>
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{formatDate(item.inviteResentAt || item.inviteSentAt)}
												</TableCell>
												<TableCell>
													<div className="flex justify-end gap-2" dir="ltr">
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
																	copyInviteLink.execute({ staffId: item.id })
																}
																disabled={copyInviteLink.isExecuting}
															>
																<Copy className="mr-1.5 size-3.5" />
																Copy link
															</Button>
														) : null}
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

							<div
								className="divide-y border-y md:hidden"
								dir={academicDataDirection}
							>
								{data.items.map((item) => (
									<div key={item.id} className="space-y-4 bg-background p-4">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-3">
												<Avatar className="h-10 w-10">
													<AvatarFallback className="bg-muted font-semibold text-foreground">
														{getInitials(item.name || item.email || "Staff")}
													</AvatarFallback>
												</Avatar>
												<div className="space-y-1">
													<p className="font-medium" dir="auto">
														{item.name || item.email || "Pending staff"}
													</p>
													<p className="text-sm text-muted-foreground">
														{item.email || "No email"}
													</p>
													{item.title ? (
														<p
															className="text-xs text-muted-foreground"
															dir="auto"
														>
															{item.title}
														</p>
													) : null}
												</div>
											</div>
											<Badge variant="secondary">{item.role}</Badge>
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
														copyInviteLink.execute({ staffId: item.id })
													}
													disabled={copyInviteLink.isExecuting}
												>
													<Copy className="mr-1.5 size-3.5" />
													Copy link
												</Button>
											) : null}
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
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</section>
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
		<div className="flex items-start justify-between gap-4 border-border px-4 py-3 md:border-r last:border-r-0">
			<div className="min-w-0 space-y-1">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
					{label}
				</p>
				<div className="text-2xl font-semibold tracking-tight">
					{value}
				</div>
				<p className="text-xs text-muted-foreground">{helper}</p>
			</div>
			<div className="mt-0.5 text-muted-foreground">
				<Icon className="h-4 w-4" />
			</div>
		</div>
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

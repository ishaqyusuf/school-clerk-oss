"use client";

import { StudentReadmitModal } from "@/components/modals/student-readmit-modal";
import {
	type StudentTermOption,
	StudentWithdrawModal,
} from "@/components/modals/student-withdraw-modal";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@school-clerk/ui/item";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, LogOut, RotateCcw } from "lucide-react";
import { useState } from "react";
import { OverviewSection } from "./overview-section";

function formatDay(value: Date | string | null | undefined) {
	if (!value) return "—";
	return new Date(value).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

const REASON_LABELS = {
	CHARGES: "fees",
	PAYMENTS: "payments",
	ASSESSMENTS: "results",
	ATTENDANCE: "attendance",
} as const;

export function StudentEnrollmentStatus({ studentId }: { studentId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const svc = useStudentOverviewSheet();
	const terms: StudentTermOption[] = (svc.overviewData?.studentTerms ?? []).map((term) => ({
		termId: term.termId,
		term: term.term,
	}));
	const history = useQuery(trpc.students.withdrawalHistory.queryOptions({ studentId }));
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const [readmitId, setReadmitId] = useState<string | null>(null);

	const refresh = () => {
		void queryClient.invalidateQueries({
			queryKey: trpc.students.withdrawalHistory.queryKey({ studentId }),
		});
		void queryClient.invalidateQueries({
			queryKey: trpc.students.overview.queryKey({ studentId }),
		});
		void queryClient.invalidateQueries({ queryKey: trpc.students.index.infiniteQueryKey() });
		void queryClient.invalidateQueries({ queryKey: trpc.students.analytics.queryKey() });
		svc.refresh();
	};

	const periods = history.data ?? [];
	const open = periods.find((period) => period.status === "withdrawn");
	const upcomingReturn = open
		? null
		: periods.find(
				(period) =>
					period.readmission &&
					new Date(period.readmission.readmittedOn).getTime() > Date.now(),
			)?.readmission;
	const needsReview = periods.flatMap((period) =>
		period.needsReview.map((item) => ({
			...item,
			reasons:
				period.reconciliation.find((entry) => entry.studentTermFormId === item.studentTermFormId)
					?.reasons ?? [],
		})),
	);

	const status = history.isPending ? (
		<Skeleton className="h-4 w-56" />
	) : (
		<span className="flex flex-wrap items-center gap-2">
			{open ? (
				<Badge variant="warning">Withdrawn</Badge>
			) : (
				<Badge variant="success">Active</Badge>
			)}
			<span>
				{open
					? `Last attended ${formatDay(open.lastEnrolledDate)}, ${open.withdrawalTerm.label ?? "affected term"}.`
					: upcomingReturn
						? `Returns ${formatDay(upcomingReturn.readmittedOn)}, ${upcomingReturn.term.label ?? "readmission term"}.`
						: "Attending. Withdrawing keeps every record."}
			</span>
		</span>
	);

	return (
		<OverviewSection
			title="Enrollment"
			description={status}
			action={
				open ? (
					<Button type="button" className="min-h-11 gap-2" onClick={() => setReadmitId(open.id)}>
						<RotateCcw className="h-4 w-4" />
						Readmit
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						className="min-h-11 gap-2"
						disabled={history.isPending || !terms.length}
						onClick={() => setWithdrawOpen(true)}
					>
						<LogOut className="h-4 w-4" />
						Withdraw
					</Button>
				)
			}
		>
			{history.error ? (
				<Alert variant="destructive">
					<CircleAlert className="h-4 w-4" />
					<AlertTitle>Enrollment history could not be loaded</AlertTitle>
					<AlertDescription>{history.error.message}</AlertDescription>
				</Alert>
			) : null}

			{needsReview.length ? (
				<Alert>
					<CircleAlert className="h-4 w-4" />
					<AlertTitle>Review later-term enrollments</AlertTitle>
					<AlertDescription>
						<p>
							Kept because they have fees, payments, results or attendance. Balances were not refunded,
							waived or prorated.
						</p>
						<ul className="mt-2 space-y-1">
							{needsReview.map((item) => (
								<li key={item.studentTermFormId} className="break-words">
									<span className="font-medium text-foreground">{item.termTitle ?? "Unknown term"}</span>
									{item.classroom ? ` · ${item.classroom}` : ""}
									{item.reasons.length
										? ` · ${item.reasons.map((reason) => REASON_LABELS[reason]).join(", ")}`
										: ""}
								</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			) : null}

			{history.isPending ? (
				<div className="space-y-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-3 w-64" />
				</div>
			) : null}

			{periods.length ? (
				<ItemGroup className="rounded-lg border">
					{periods.map((period, index) => (
						<div key={period.id}>
							{index > 0 ? <ItemSeparator /> : null}
							<Item size="sm" className="items-start">
								<ItemContent className="min-w-0 gap-1">
									<ItemTitle>Withdrawn from {period.withdrawalTerm.label ?? "an unknown term"}</ItemTitle>
									<ItemDescription className="line-clamp-none">
										Last attended {formatDay(period.lastEnrolledDate)}
										{period.withdrawnBy ? ` · recorded by ${period.withdrawnBy}` : ""}
									</ItemDescription>
									<p className="break-words text-sm text-foreground">{period.reason}</p>
									{period.note ? (
										<p className="break-words text-sm text-muted-foreground">{period.note}</p>
									) : null}
									{period.reconciliation.length ? (
										<ItemDescription>
											Later terms: {period.reconciliation.filter((entry) => entry.action === "ARCHIVED").length}{" "}
											archived, {period.reconciliation.filter((entry) => entry.action === "FLAGGED").length} kept
											for review
										</ItemDescription>
									) : null}
									{period.readmission ? (
										<ItemDescription className="line-clamp-none">
											Readmitted for {period.readmission.term.label ?? "an unknown term"} from{" "}
											{formatDay(period.readmission.readmittedOn)}
											{period.readmission.readmittedBy ? ` · by ${period.readmission.readmittedBy}` : ""}
											{period.readmission.note ? `. ${period.readmission.note}` : ""}
										</ItemDescription>
									) : null}
								</ItemContent>
								<ItemActions>
									<Badge variant={period.status === "withdrawn" ? "warning" : "outline"}>
										{period.status === "withdrawn" ? "Open" : "Readmitted"}
									</Badge>
								</ItemActions>
							</Item>
						</div>
					))}
				</ItemGroup>
			) : null}

			<StudentWithdrawModal
				open={withdrawOpen}
				onOpenChange={setWithdrawOpen}
				studentId={studentId}
				terms={terms}
				defaultTermId={svc.activeStudentTerm?.termId ?? terms[0]?.termId}
				onSuccess={refresh}
			/>
			<StudentReadmitModal
				withdrawalId={readmitId}
				onOpenChange={(value) => !value && setReadmitId(null)}
				studentId={studentId}
				terms={terms}
				onSuccess={refresh}
			/>
		</OverviewSection>
	);
}

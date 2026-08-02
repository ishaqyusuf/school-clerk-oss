"use client";

import type { AcademicMetadataTarget } from "@/components/modals/edit-academic-metadata-modal";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card } from "@school-clerk/ui/composite";
import { differenceInCalendarDays } from "date-fns";
import { History, Pencil, TrendingUp } from "lucide-react";

type DashboardSession =
	RouterOutputs["academics"]["dashboard"]["sessions"][number];
type DashboardTerm = DashboardSession["terms"][number];

type Props = {
	canManageAcademics: boolean;
	currentSession: DashboardSession | undefined;
	currentTerm: DashboardTerm | null;
	sessionCount: number;
	totalTerms: number;
	onEdit: (target: AcademicMetadataTarget) => void;
};

export function AcademicSummaryCards({
	canManageAcademics,
	currentSession,
	currentTerm,
	sessionCount,
	totalTerms,
	onEdit,
}: Props) {
	const currentTermStartDate = currentTerm?.startDate
		? new Date(currentTerm.startDate)
		: null;
	const currentTermEndDate = currentTerm?.endDate
		? new Date(currentTerm.endDate)
		: null;
	const daysRemaining = currentTermEndDate
		? Math.max(0, differenceInCalendarDays(currentTermEndDate, new Date()))
		: null;
	const termProgress =
		currentTermStartDate && currentTermEndDate
			? Math.min(
					100,
					Math.max(
						0,
						Math.round(
							(differenceInCalendarDays(new Date(), currentTermStartDate) /
								Math.max(
									1,
									differenceInCalendarDays(
										currentTermEndDate,
										currentTermStartDate,
									),
								)) *
								100,
						),
					),
				)
			: null;

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<Card.Root className="flex flex-col gap-4 p-6">
				<div className="flex items-start justify-between gap-2">
					<span className="text-sm font-medium text-muted-foreground">
						Current Session Status
					</span>
					<div className="flex items-center gap-2">
						{currentSession && canManageAcademics ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 gap-1.5 px-2 text-xs"
								onClick={() =>
									onEdit({
										kind: "session",
										id: currentSession.id,
										title: currentSession.name,
										startDate: currentSession.startDate,
										endDate: currentSession.endDate,
									})
								}
							>
								<Pencil data-icon="inline-start" />
								Edit session
							</Button>
						) : null}
						<Badge variant={currentSession ? "success" : "outline"}>
							{currentSession ? "ACTIVE" : "NONE"}
						</Badge>
					</div>
				</div>
				<p className="text-2xl font-bold tracking-tight">
					{currentSession?.name ?? "No active session"}
				</p>
				<div className="flex items-center gap-2 text-muted-foreground">
					<TrendingUp className="h-4 w-4" />
					<span className="text-xs font-bold uppercase">
						{currentTerm ? `${currentTerm.title} in progress` : "Not started"}
					</span>
				</div>
			</Card.Root>

			<Card className="flex flex-col gap-4 p-6">
				<span className="text-sm font-medium text-muted-foreground">
					Total Terms Created
				</span>
				<p className="text-2xl font-bold tracking-tight">
					{totalTerms} {totalTerms === 1 ? "Term" : "Terms"} Recorded
				</p>
				<div className="flex items-center gap-2 text-muted-foreground">
					<History className="h-4 w-4" />
					<span className="text-xs font-medium">
						Across {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
					</span>
				</div>
			</Card>

			<Card className="flex flex-col gap-4 p-6">
				<div className="flex items-start justify-between gap-2">
					<span className="text-sm font-medium text-muted-foreground">
						Days Remaining {currentTerm ? `(${currentTerm.title})` : ""}
					</span>
					{currentTerm && canManageAcademics ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 shrink-0 gap-1.5 px-2 text-xs"
							onClick={() =>
								onEdit({
									kind: "term",
									id: currentTerm.id,
									title: currentTerm.title,
									startDate: currentTerm.startDate,
									endDate: currentTerm.endDate,
									lifecycleStatus: "ACTIVE",
								})
							}
						>
							<Pencil data-icon="inline-start" />
							Edit term
						</Button>
					) : null}
				</div>
				<p className="text-2xl font-bold tracking-tight">
					{daysRemaining === null
						? "No end date"
						: `${daysRemaining} ${daysRemaining === 1 ? "Day" : "Days"} Left`}
				</p>
				<div className="h-1.5 w-full rounded-full bg-secondary">
					<div
						className="h-1.5 rounded-full bg-primary"
						style={{ width: `${termProgress ?? 0}%` }}
					/>
				</div>
			</Card>
		</div>
	);
}

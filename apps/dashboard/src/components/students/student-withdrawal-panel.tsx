"use client";

import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import { Textarea } from "@school-clerk/ui/textarea";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, RotateCcw } from "lucide-react";
import { useState } from "react";

type TermOption = { termId: string; term: string };

/** A calendar day from a date input, as local midnight (how term dates are stored). */
function localDay(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

function todayInput() {
	const now = new Date();
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDay(value: Date | string | null | undefined) {
	if (!value) return "--";
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

export function StudentWithdrawalPanel({ studentId }: { studentId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const svc = useStudentOverviewSheet();
	const terms: TermOption[] = (svc.overviewData?.studentTerms ?? []).map((term) => ({
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

	return (
		<Card className="rounded-xl border-border shadow-sm">
			<CardContent className="space-y-4 p-4 sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="text-base font-bold text-foreground">Enrollment status</h3>
							{history.isPending ? null : open ? (
								<Badge variant="warning">Withdrawn</Badge>
							) : (
								<Badge variant="success">Active</Badge>
							)}
						</div>
						<p className="mt-1 text-sm text-muted-foreground">
							{open
								? `Last enrolled ${formatDay(open.lastEnrolledDate)} in ${open.withdrawalTerm.label ?? "the affected term"}. Records, results, fees and payments are kept.`
								: "Withdrawing keeps the profile, results, attendance, fees and payments. It is not the same as deleting the student."}
						</p>
					</div>
					{open ? (
						<Button
							type="button"
							className="min-h-11 shrink-0 gap-2"
							onClick={() => setReadmitId(open.id)}
						>
							<RotateCcw className="h-4 w-4" />
							Readmit student
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							className="min-h-11 shrink-0 gap-2"
							disabled={history.isPending || !terms.length}
							onClick={() => setWithdrawOpen(true)}
						>
							<LogOut className="h-4 w-4" />
							Withdraw student
						</Button>
					)}
				</div>

				{history.error ? (
					<p role="alert" className="break-words text-sm text-destructive">
						{history.error.message}
					</p>
				) : null}

				{periods.flatMap((period) => period.needsReview).length ? (
					<div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg">
						<p className="font-medium">Enrollments to review after withdrawal</p>
						<p className="mt-1 text-xs">
							These enrollments are in terms after the withdrawal. They were kept because they have
							fees, payments, results or attendance. Balances were not refunded, waived or prorated.
						</p>
						<ul className="mt-2 space-y-1">
							{periods.flatMap((period) =>
								period.needsReview.map((item) => {
									const snapshot = period.reconciliation.find(
										(entry) => entry.studentTermFormId === item.studentTermFormId,
									);
									return (
										<li key={item.studentTermFormId} className="break-words">
											<span className="font-medium">{item.termTitle ?? "Unknown term"}</span>
											{item.classroom ? ` · ${item.classroom}` : ""}
											{snapshot?.reasons.length
												? ` · has ${snapshot.reasons.map((reason) => REASON_LABELS[reason]).join(", ")}`
												: ""}
										</li>
									);
								}),
							)}
						</ul>
					</div>
				) : null}

				{periods.length ? (
					<div className="divide-y divide-border rounded-lg border border-border">
						{periods.map((period) => (
							<div key={period.id} className="space-y-1 p-3 text-sm">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="font-medium text-foreground">
										Withdrawn from {period.withdrawalTerm.label ?? "an unknown term"}
									</p>
									<Badge variant={period.status === "withdrawn" ? "warning" : "secondary"}>
										{period.status === "withdrawn" ? "Open" : "Readmitted"}
									</Badge>
								</div>
								<p className="text-muted-foreground">
									Last enrolled day {formatDay(period.lastEnrolledDate)} · Recorded{" "}
									{formatDay(period.recordedAt)}
									{period.withdrawnBy ? ` by ${period.withdrawnBy}` : ""}
								</p>
								<p className="break-words text-foreground">Reason: {period.reason}</p>
								{period.note ? (
									<p className="break-words text-muted-foreground">{period.note}</p>
								) : null}
								{period.reconciliation.length ? (
									<p className="text-xs text-muted-foreground">
										Future enrollments:{" "}
										{period.reconciliation.filter((entry) => entry.action === "ARCHIVED").length}{" "}
										archived,{" "}
										{period.reconciliation.filter((entry) => entry.action === "FLAGGED").length}{" "}
										kept for review
									</p>
								) : null}
								{period.readmission ? (
									<p className="text-muted-foreground">
										Readmitted for {period.readmission.term.label ?? "an unknown term"} from{" "}
										{formatDay(period.readmission.readmittedOn)}
										{period.readmission.readmittedBy ? ` by ${period.readmission.readmittedBy}` : ""}
										{period.readmission.note ? `. ${period.readmission.note}` : ""}
									</p>
								) : null}
							</div>
						))}
					</div>
				) : null}
			</CardContent>

			<WithdrawDialog
				open={withdrawOpen}
				onOpenChange={setWithdrawOpen}
				studentId={studentId}
				terms={terms}
				defaultTermId={svc.activeStudentTerm?.termId ?? terms[0]?.termId ?? ""}
				onDone={refresh}
			/>
			<ReadmitDialog
				withdrawalId={readmitId}
				onOpenChange={(value) => !value && setReadmitId(null)}
				studentId={studentId}
				terms={terms}
				onDone={refresh}
			/>
		</Card>
	);
}

function WithdrawDialog({
	open,
	onOpenChange,
	studentId,
	terms,
	defaultTermId,
	onDone,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	terms: TermOption[];
	defaultTermId: string;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const [termId, setTermId] = useState(defaultTermId);
	const [lastDay, setLastDay] = useState(todayInput);
	const [reason, setReason] = useState("");
	const [note, setNote] = useState("");
	const mutation = useMutation(
		trpc.students.withdrawStudent.mutationOptions({
			retry: false,
			networkMode: "always",
			onSuccess(result) {
				toast({
					title: "Student withdrawn",
					description:
						result && (result.archived || result.flagged)
							? `${result.archived} future enrollment(s) archived, ${result.flagged} kept for review.`
							: "The student is removed from active rosters after the last enrolled day.",
				});
				onOpenChange(false);
				setReason("");
				setNote("");
				onDone();
			},
		}),
	);
	const selectedTermId = termId || defaultTermId;
	const canSubmit = Boolean(selectedTermId && lastDay && reason.trim().length >= 3) && !mutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(value) => !mutation.isPending && onOpenChange(value)}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Withdraw student</DialogTitle>
					<DialogDescription>
						The student leaves active rosters after the last enrolled day and cannot be enrolled in later
						terms until readmitted. Results, attendance, fees and payments stay as they are.
					</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!canSubmit) return;
						mutation.mutate({
							studentId,
							withdrawalTermId: selectedTermId,
							lastEnrolledDate: localDay(lastDay),
							reason: reason.trim(),
							note: note.trim() || null,
						});
					}}
				>
					<div className="grid gap-2">
						<Label htmlFor="withdrawal-term">Affected term</Label>
						<Select value={selectedTermId} onValueChange={setTermId}>
							<SelectTrigger id="withdrawal-term" className="min-h-11">
								<SelectValue placeholder="Select term" />
							</SelectTrigger>
							<SelectContent>
								{terms.map((term) => (
									<SelectItem key={term.termId} value={term.termId} className="min-h-11">
										{term.term}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="withdrawal-last-day">Last enrolled day</Label>
						<Input
							id="withdrawal-last-day"
							type="date"
							className="min-h-11"
							value={lastDay}
							onChange={(event) => setLastDay(event.target.value)}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="withdrawal-reason">Reason</Label>
						<Textarea
							id="withdrawal-reason"
							value={reason}
							maxLength={500}
							placeholder="For example: family relocated to another state"
							onChange={(event) => setReason(event.target.value)}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="withdrawal-note">Note (optional)</Label>
						<Textarea
							id="withdrawal-note"
							value={note}
							maxLength={2000}
							onChange={(event) => setNote(event.target.value)}
						/>
					</div>
					{mutation.error ? (
						<p role="alert" className="break-words text-sm text-destructive">
							{mutation.error.message}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							disabled={mutation.isPending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" className="min-h-11" disabled={!canSubmit}>
							{mutation.isPending ? <Spinner /> : null}
							Withdraw student
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ReadmitDialog({
	withdrawalId,
	onOpenChange,
	studentId,
	terms,
	onDone,
}: {
	withdrawalId: string | null;
	onOpenChange: (open: boolean) => void;
	studentId: string;
	terms: TermOption[];
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const [termId, setTermId] = useState("");
	const [day, setDay] = useState(todayInput);
	const [note, setNote] = useState("");
	const mutation = useMutation(
		trpc.students.readmitStudent.mutationOptions({
			retry: false,
			networkMode: "always",
			onSuccess() {
				toast({
					title: "Student readmitted",
					description: "Enroll the student in a class for the readmission term. Earlier gaps are left as they are.",
				});
				onOpenChange(false);
				setNote("");
				onDone();
			},
		}),
	);
	const canSubmit = Boolean(withdrawalId && termId && day) && !mutation.isPending;

	return (
		<Dialog open={Boolean(withdrawalId)} onOpenChange={(value) => !mutation.isPending && onOpenChange(value)}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Readmit student</DialogTitle>
					<DialogDescription>
						Readmission reuses this student&apos;s existing profile. It does not fill enrollments for the
						terms the student missed.
					</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!canSubmit || !withdrawalId) return;
						mutation.mutate({
							studentId,
							withdrawalId,
							readmissionTermId: termId,
							readmittedOn: localDay(day),
							note: note.trim() || null,
						});
					}}
				>
					<div className="grid gap-2">
						<Label htmlFor="readmission-term">Readmission term</Label>
						<Select value={termId} onValueChange={setTermId}>
							<SelectTrigger id="readmission-term" className="min-h-11">
								<SelectValue placeholder="Select term" />
							</SelectTrigger>
							<SelectContent>
								{terms.map((term) => (
									<SelectItem key={term.termId} value={term.termId} className="min-h-11">
										{term.term}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="readmission-day">Returns on</Label>
						<Input
							id="readmission-day"
							type="date"
							className="min-h-11"
							value={day}
							onChange={(event) => setDay(event.target.value)}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="readmission-note">Note (optional)</Label>
						<Textarea
							id="readmission-note"
							value={note}
							maxLength={2000}
							onChange={(event) => setNote(event.target.value)}
						/>
					</div>
					{mutation.error ? (
						<p role="alert" className="break-words text-sm text-destructive">
							{mutation.error.message}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="min-h-11"
							disabled={mutation.isPending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" className="min-h-11" disabled={!canSubmit}>
							{mutation.isPending ? <Spinner /> : null}
							Readmit student
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

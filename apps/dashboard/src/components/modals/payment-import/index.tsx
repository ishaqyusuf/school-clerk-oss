"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Dialog } from "@school-clerk/ui/composite";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Progress } from "@school-clerk/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { Separator } from "@school-clerk/ui/separator";
import { Textarea } from "@school-clerk/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	CheckCircle2,
	Download,
	FileUp,
	Loader2,
	RefreshCw,
	RotateCcw,
	Upload,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
	type ParsedPaymentImportRow,
	type PaymentImportMode,
	parsePaymentImportCsv,
} from "./parser";

type Verification = RouterOutputs["finance"]["verifyPaymentImport"];
type ReviewRow = Verification["rows"][number];
type ImportPhase = "setup" | "review" | "import";

const MODE_LABELS: Record<PaymentImportMode, string> = {
	STUDENT: "Student payments",
	STAFF: "Staff wages",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
	SCHOOL_FEE: "School fee",
	ENTRANCE_FORM: "Entrance form",
	BOOK: "Books",
	UNIFORM: "Uniform",
	WAGE: "Wages",
};

function formatMoney(value: number) {
	return new Intl.NumberFormat("en-NG", {
		style: "currency",
		currency: "NGN",
		maximumFractionDigits: 2,
	}).format(value);
}

function toVerificationInput(row: ReviewRow | ParsedPaymentImportRow) {
	return {
		lineNumber: row.lineNumber,
		paymentDate: row.paymentDate,
		counterpartyName: row.counterpartyName,
		paymentType: row.paymentType,
		amount: row.amount,
		sourceNote: row.sourceNote,
		counterpartyId: row.counterpartyId,
		streamId: row.streamId,
		itemId: row.itemId,
		allowDuplicate: row.allowDuplicate,
		skip: row.skip,
	};
}

function csvCell(value: unknown) {
	const text = value == null ? "" : String(value);
	return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function paymentImportResultCsv(
	job: NonNullable<RouterOutputs["finance"]["getPaymentImportJob"]>,
) {
	const headers = [
		"source_line",
		"date",
		"counterparty_name",
		"payment_type",
		"amount",
		"source_note",
		"status",
		"counterparty_id",
		"stream_id",
		"item_id",
		"charge_id",
		"payment_id",
		"allocation_id",
		"ledger_entry_id",
		"reason",
	];
	const rows = job.rows.map((row) => {
		const payload =
			row.payload && typeof row.payload === "object"
				? (row.payload as Record<string, unknown>)
				: {};
		return [
			row.lineNumber,
			payload.paymentDate,
			payload.counterpartyName,
			payload.paymentType,
			payload.amount,
			payload.sourceNote,
			row.status,
			row.counterpartyId,
			row.streamId,
			row.itemId,
			row.chargeId,
			row.paymentId,
			row.allocationId,
			row.ledgerEntryId,
			row.reason,
		]
			.map(csvCell)
			.join(",");
	});
	return [headers.join(","), ...rows].join("\n");
}

export function PaymentImportModal() {
	const searchParams = useSearchParams();
	const [, setParams] = useQueryStates({
		action: parseAsString,
		paymentImportMode: parseAsString,
	});
	const open = searchParams.get("action") === "payment-import";
	const requestedMode =
		searchParams.get("paymentImportMode") === "STAFF" ? "STAFF" : "STUDENT";
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [phase, setPhase] = useState<ImportPhase>("setup");
	const [mode, setMode] = useState<PaymentImportMode>(requestedMode);
	const [termId, setTermId] = useState("");
	const [method, setMethod] = useState("Transfer");
	const [defaultDate, setDefaultDate] = useState("");
	const [sourceFileName, setSourceFileName] = useState("");
	const [raw, setRaw] = useState("");
	const [verification, setVerification] = useState<Verification | null>(null);
	const [jobId, setJobId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [termConfirmed, setTermConfirmed] = useState(false);

	useEffect(() => {
		if (!open) return;
		setMode(requestedMode);
	}, [open, requestedMode]);

	const { data: terms = [], isLoading: isLoadingTerms } = useQuery(
		trpc.academics.getReportTerms.queryOptions({}, { enabled: open }),
	);
	const parsed = useMemo(() => parsePaymentImportCsv(raw, mode), [mode, raw]);

	const verifyImport = useMutation(
		trpc.finance.verifyPaymentImport.mutationOptions(),
	);
	const startImport = useMutation(
		trpc.finance.startPaymentImportJob.mutationOptions({
			onSuccess: (job) => {
				if (!job) return;
				setJobId(job.id);
				setPhase("import");
			},
		}),
	);
	const retryImport = useMutation(
		trpc.finance.retryPaymentImportJob.mutationOptions(),
	);
	const { data: latestJob } = useQuery(
		trpc.finance.getPaymentImportJob.queryOptions(
			{},
			{
				enabled: open && phase === "setup" && !jobId,
			},
		),
	);
	const { data: job } = useQuery(
		trpc.finance.getPaymentImportJob.queryOptions(
			{ jobId: jobId ?? undefined },
			{
				enabled: Boolean(jobId) && phase === "import",
				refetchInterval: (query) => {
					const status = query.state.data?.status;
					return status === "COMPLETED" ||
						status === "COMPLETED_WITH_FAILURES" ||
						status === "FAILED" ||
						status === "CANCELLED"
						? false
						: 1_500;
				},
			},
		),
	);
	const jobFinished =
		job?.status === "COMPLETED" ||
		job?.status === "COMPLETED_WITH_FAILURES" ||
		job?.status === "FAILED" ||
		job?.status === "CANCELLED";
	const resumableJob =
		latestJob &&
		(latestJob.status === "PENDING" ||
			latestJob.status === "RUNNING" ||
			latestJob.status === "COMPLETED_WITH_FAILURES" ||
			latestJob.status === "FAILED")
			? latestJob
			: null;

	useEffect(() => {
		if (!jobFinished) return;
		void Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getPayments.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getCharges.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getLedgerEntries.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.overview.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getWorkspaceSummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.finance.getAccounts.queryKey(),
			}),
		]);
	}, [jobFinished, queryClient, trpc]);

	const reset = () => {
		setPhase("setup");
		setVerification(null);
		setJobId(null);
		setError(null);
		setRaw("");
		setSourceFileName("");
		setDefaultDate("");
		setTermConfirmed(false);
	};
	const close = () => {
		reset();
		void setParams({ action: null, paymentImportMode: null });
	};

	const rowsWithDefaultDate = (rows: ParsedPaymentImportRow[]) =>
		rows.map((row) => ({
			...row,
			paymentDate: row.paymentDate || defaultDate || null,
		}));

	const analyze = async (rows = rowsWithDefaultDate(parsed.rows)) => {
		setError(null);
		if (!termId) {
			setError("Select a term.");
			return;
		}
		if (parsed.errors.length || !rows.length) {
			setError("Resolve the CSV errors before review.");
			return;
		}
		try {
			const result = await verifyImport.mutateAsync({
				mode,
				termId,
				rows: rows.map(toVerificationInput),
			});
			setVerification(result);
			setPhase("review");
			setTermConfirmed(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Verification failed.");
		}
	};

	const updateRow = (lineNumber: number, update: Partial<ReviewRow>) => {
		setVerification((current) =>
			current
				? {
						...current,
						rows: current.rows.map((row) =>
							row.lineNumber === lineNumber ? { ...row, ...update } : row,
						),
					}
				: current,
		);
	};

	const applyStreamToType = (paymentType: string, streamId: string) => {
		setVerification((current) =>
			current
				? {
						...current,
						rows: current.rows.map((row) =>
							row.paymentType === paymentType
								? {
										...row,
										streamId,
										itemId:
											current.items.find(
												(item) =>
													item.id === row.itemId && item.streamId === streamId,
											)?.id ?? null,
									}
								: row,
						),
					}
				: current,
		);
	};

	const applyItemToType = (paymentType: string, itemId: string | null) => {
		setVerification((current) =>
			current
				? {
						...current,
						rows: current.rows.map((row) => {
							if (row.paymentType !== paymentType) return row;
							const item = current.items.find((entry) => entry.id === itemId);
							return {
								...row,
								itemId: item?.id ?? null,
								streamId: item?.streamId ?? row.streamId,
							};
						}),
					}
				: current,
		);
	};

	const refreshReview = async () => {
		if (!verification) return;
		await analyze(
			verification.rows.map((row) => ({
				...toVerificationInput(row),
			})),
		);
	};

	const execute = async () => {
		if (!verification) return;
		setError(null);
		try {
			const rows = verification.rows.map((row) => {
				if (row.skip) return toVerificationInput(row);
				if (!row.paymentDate || !row.counterpartyId || !row.streamId) {
					throw new Error(`Line ${row.lineNumber} still needs review.`);
				}
				return {
					...toVerificationInput(row),
					paymentDate: row.paymentDate,
					counterpartyId: row.counterpartyId,
					streamId: row.streamId,
				};
			});
			await startImport.mutateAsync({
				mode,
				termId,
				method: method.trim() || null,
				sourceFileName: sourceFileName || null,
				rows,
			});
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Import could not start.",
			);
		}
	};

	const retryFailedRows = async () => {
		if (!jobId) return;
		setError(null);
		try {
			await retryImport.mutateAsync({ jobId });
			await queryClient.invalidateQueries({
				queryKey: trpc.finance.getPaymentImportJob.queryKey({
					jobId,
				}),
			});
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Retry could not start.",
			);
		}
	};

	const downloadResults = () => {
		if (!job) return;
		const blob = new Blob([paymentImportResultCsv(job)], {
			type: "text/csv;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `payment-import-${job.id}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		setSourceFileName(file.name);
		setRaw(await file.text());
		setVerification(null);
		setPhase("setup");
	};

	const paymentTypes = useMemo(
		() =>
			Array.from(
				new Set(verification?.rows.map((row) => row.paymentType) ?? []),
			),
		[verification],
	);
	const isRowReady = (row: ReviewRow) => {
		const item = verification?.items.find((entry) => entry.id === row.itemId);
		return (
			!row.skip &&
			Boolean(row.paymentDate) &&
			Boolean(row.counterpartyId) &&
			Boolean(row.streamId) &&
			(!row.itemId || item?.streamId === row.streamId) &&
			(!row.duplicate || row.allowDuplicate) &&
			(mode === "STAFF" || Boolean(row.studentTermFormId))
		);
	};
	const readyRows = verification?.rows.filter(isRowReady) ?? [];
	const skippedRows =
		verification?.rows.filter((row) => Boolean(row.skip)) ?? [];
	const attentionRows =
		verification?.rows.filter((row) => !row.skip && !isRowReady(row)) ?? [];
	const unresolvedCount =
		(verification?.rows.length ?? 0) - readyRows.length - skippedRows.length;
	const reviewSections = [
		{
			key: "attention",
			title: "Needs attention",
			rows: attentionRows,
		},
		{ key: "ready", title: "Ready", rows: readyRows },
		{ key: "skipped", title: "Skipped", rows: skippedRows },
	].filter((section) => section.rows.length > 0);
	const progress = job?.totalRows
		? Math.round((job.processedRows / job.totalRows) * 100)
		: 0;

	return (
		<Dialog.Root open={open} onOpenChange={close}>
			<Dialog.Content className="flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[88vh] sm:max-h-[88vh] sm:w-[96vw] sm:max-w-6xl sm:rounded-lg sm:border">
				<Dialog.Header className="shrink-0 border-b px-4 py-3 sm:px-6">
					<div className="flex items-start justify-between gap-3">
						<div>
							<Dialog.Title>Import payments</Dialog.Title>
							<Dialog.Description>{MODE_LABELS[mode]}</Dialog.Description>
						</div>
						<Badge variant="outline" className="mr-8">
							{phase === "setup"
								? "Setup"
								: phase === "review"
									? "Review"
									: "Import"}
						</Badge>
					</div>
				</Dialog.Header>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{phase === "setup" ? (
						<div className="space-y-5 px-4 py-4 sm:px-6">
							{resumableJob ? (
								<Alert>
									<RefreshCw className="h-4 w-4" />
									<AlertTitle>Previous import available</AlertTitle>
									<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
										<span>
											{resumableJob.processedRows} of {resumableJob.totalRows}{" "}
											rows processed.
										</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												setJobId(resumableJob.id);
												setMode(resumableJob.mode);
												setPhase("import");
											}}
										>
											Resume import
										</Button>
									</AlertDescription>
								</Alert>
							) : null}
							<div className="grid gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label>Import type</Label>
									<div className="grid grid-cols-2 rounded-md border p-1">
										{(["STUDENT", "STAFF"] as const).map((value) => (
											<Button
												key={value}
												type="button"
												variant={mode === value ? "secondary" : "ghost"}
												size="sm"
												onClick={() => {
													setMode(value);
													setVerification(null);
												}}
											>
												{value === "STUDENT" ? "Students" : "Staff"}
											</Button>
										))}
									</div>
								</div>
								<div className="space-y-2">
									<Label>Term</Label>
									<Select
										value={termId}
										onValueChange={(value) => {
											setTermId(value);
											setTermConfirmed(false);
											setVerification(null);
											setPhase("setup");
										}}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={
													isLoadingTerms ? "Loading terms..." : "Select term"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{terms.map((term) => (
												<SelectItem key={term.id} value={term.id}>
													{term.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="payment-import-method">Payment method</Label>
									<Input
										id="payment-import-method"
										value={method}
										onChange={(event) => setMethod(event.target.value)}
										placeholder="Transfer, cash, POS"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="payment-import-default-date">
										Missing-date fallback
									</Label>
									<Input
										id="payment-import-default-date"
										type="date"
										value={defaultDate}
										onChange={(event) => setDefaultDate(event.target.value)}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="payment-import-file">CSV file</Label>
								<Input
									id="payment-import-file"
									type="file"
									accept=".csv,text/csv"
									onChange={onFile}
								/>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3">
									<Label htmlFor="payment-import-csv">CSV data</Label>
									<div className="flex gap-2">
										<Badge variant="secondary">{parsed.rows.length} rows</Badge>
										<Badge
											variant={parsed.errors.length ? "destructive" : "outline"}
										>
											{parsed.errors.length} errors
										</Badge>
									</div>
								</div>
								<Textarea
									id="payment-import-csv"
									dir="auto"
									className="min-h-72 resize-y font-mono text-xs leading-6"
									value={raw}
									onChange={(event) => {
										setRaw(event.target.value);
										setVerification(null);
									}}
									placeholder={
										mode === "STUDENT"
											? "date,student_name,payment_type,amount,source_note"
											: "date,staff_name,payment_type,amount,source_note"
									}
								/>
							</div>

							{parsed.errors.length > 0 ? (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>CSV needs attention</AlertTitle>
									<AlertDescription>
										<ul className="mt-1 space-y-1">
											{parsed.errors.slice(0, 8).map((item, index) => (
												<li key={`${item.lineNumber}-${index}`}>
													{item.lineNumber ? `Line ${item.lineNumber}: ` : ""}
													{item.message}
												</li>
											))}
										</ul>
									</AlertDescription>
								</Alert>
							) : null}
						</div>
					) : null}

					{phase === "review" && verification ? (
						<div className="space-y-4 px-4 py-4 sm:px-6">
							<div className="flex flex-wrap items-center gap-2 border-b pb-4">
								<Badge>{verification.context.sessionTitle}</Badge>
								<Badge variant="secondary">
									{verification.context.termTitle}
								</Badge>
								<Badge variant="outline">{verification.rows.length} rows</Badge>
								{skippedRows.length ? (
									<Badge variant="secondary">
										{skippedRows.length} skipped
									</Badge>
								) : null}
								<Badge variant="outline">
									{formatMoney(verification.summary.totalAmount)}
								</Badge>
								{unresolvedCount ? (
									<Badge variant="destructive">
										{unresolvedCount} need attention
									</Badge>
								) : (
									<Badge className="gap-1">
										<CheckCircle2 className="h-3.5 w-3.5" />
										Ready
									</Badge>
								)}
							</div>

							<div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
								<Checkbox
									id="payment-import-term-confirmation"
									checked={termConfirmed}
									onCheckedChange={(checked) =>
										setTermConfirmed(checked === true)
									}
								/>
								<Label
									htmlFor="payment-import-term-confirmation"
									className="leading-5"
								>
									Apply every imported row to{" "}
									<strong>
										{verification.context.sessionTitle} ·{" "}
										{verification.context.termTitle}
									</strong>
									.
								</Label>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								{paymentTypes.map((paymentType) => {
									const currentStreamId =
										verification.rows.find(
											(row) => row.paymentType === paymentType && row.streamId,
										)?.streamId ?? "";
									const expectedType =
										paymentType === "WAGE" ? "DEBIT" : "CREDIT";
									const currentItemId =
										verification.rows.find(
											(row) => row.paymentType === paymentType && row.itemId,
										)?.itemId ?? "";
									return (
										<div
											key={paymentType}
											className="grid gap-2 sm:grid-cols-2"
										>
											<Label>{PAYMENT_TYPE_LABELS[paymentType]}</Label>
											<span className="hidden sm:block" />
											<Select
												value={currentStreamId || undefined}
												onValueChange={(value) =>
													applyStreamToType(paymentType, value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select finance account" />
												</SelectTrigger>
												<SelectContent>
													{verification.streams
														.filter(
															(stream) => stream.accountType === expectedType,
														)
														.map((stream) => (
															<SelectItem key={stream.id} value={stream.id}>
																{stream.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
											<Select
												value={currentItemId || "__none"}
												onValueChange={(value) =>
													applyItemToType(
														paymentType,
														value === "__none" ? null : value,
													)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Optional finance item" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none">
														No finance item
													</SelectItem>
													{verification.items
														.filter((item) => item.streamId === currentStreamId)
														.map((item) => (
															<SelectItem key={item.id} value={item.id}>
																{item.name}
															</SelectItem>
														))}
												</SelectContent>
											</Select>
										</div>
									);
								})}
							</div>

							<Separator />

							<div className="space-y-4">
								{reviewSections.map((section) => (
									<section key={section.key} className="space-y-2">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-semibold">{section.title}</h3>
											<Badge variant="outline">{section.rows.length}</Badge>
										</div>
										<div className="divide-y rounded-md border">
											{section.rows.map((row) => {
												const rowReady = isRowReady(row);
												return (
													<div
														key={row.lineNumber}
														className="grid gap-3 px-3 py-3 lg:grid-cols-[4rem_minmax(11rem,1.15fr)_10rem_minmax(12rem,1.2fr)_10rem_10rem]"
													>
														<div className="flex items-center gap-2 lg:block">
															<span className="text-xs text-muted-foreground">
																Line {row.lineNumber}
															</span>
															<Badge
																variant={
																	row.skip
																		? "secondary"
																		: rowReady
																			? "outline"
																			: "destructive"
																}
																className="lg:mt-1"
															>
																{row.skip
																	? "Skipped"
																	: rowReady
																		? "Ready"
																		: "Review"}
															</Badge>
														</div>
														<div className="min-w-0">
															<p dir="auto" className="truncate font-medium">
																{row.counterpartyName}
															</p>
															<p className="text-xs text-muted-foreground">
																{PAYMENT_TYPE_LABELS[row.paymentType]} ·{" "}
																{formatMoney(row.amount)}
															</p>
															{row.sourceNote ? (
																<p className="mt-1 truncate text-xs text-muted-foreground">
																	{row.sourceNote}
																</p>
															) : null}
															{row.duplicate ? (
																<Button
																	type="button"
																	variant={
																		row.allowDuplicate ? "secondary" : "outline"
																	}
																	size="sm"
																	className="mt-2 h-7"
																	onClick={() =>
																		updateRow(row.lineNumber, {
																			allowDuplicate: !row.allowDuplicate,
																		})
																	}
																>
																	{row.allowDuplicate
																		? "Duplicate confirmed"
																		: "Import duplicate anyway"}
																</Button>
															) : null}
															<Button
																type="button"
																variant="ghost"
																size="sm"
																className="mt-2 h-7 px-2"
																onClick={() =>
																	updateRow(row.lineNumber, {
																		skip: !row.skip,
																	})
																}
															>
																{row.skip ? "Include row" : "Skip row"}
															</Button>
														</div>
														<Input
															type="date"
															aria-label={`Payment date for line ${row.lineNumber}`}
															value={row.paymentDate ?? ""}
															disabled={Boolean(row.skip)}
															onChange={(event) =>
																updateRow(row.lineNumber, {
																	paymentDate: event.target.value || null,
																})
															}
														/>
														<Select
															value={row.counterpartyId ?? undefined}
															disabled={Boolean(row.skip)}
															onValueChange={(value) => {
																const candidate =
																	verification.counterparties.find(
																		(item) => item.id === value,
																	);
																updateRow(row.lineNumber, {
																	counterpartyId: value,
																	studentTermFormId:
																		candidate?.studentTermFormId ?? null,
																});
															}}
														>
															<SelectTrigger dir="auto">
																<SelectValue placeholder="Select match" />
															</SelectTrigger>
															<SelectContent>
																{verification.counterparties.map(
																	(candidate) => (
																		<SelectItem
																			key={candidate.id}
																			value={candidate.id}
																			dir="auto"
																		>
																			{candidate.name}
																			{candidate.detail
																				? ` · ${candidate.detail}`
																				: ""}
																		</SelectItem>
																	),
																)}
															</SelectContent>
														</Select>
														<Select
															value={row.streamId ?? undefined}
															disabled={Boolean(row.skip)}
															onValueChange={(value) => {
																const itemStillValid = verification.items.some(
																	(item) =>
																		item.id === row.itemId &&
																		item.streamId === value,
																);
																updateRow(row.lineNumber, {
																	streamId: value,
																	itemId: itemStillValid ? row.itemId : null,
																});
															}}
														>
															<SelectTrigger>
																<SelectValue placeholder="Account" />
															</SelectTrigger>
															<SelectContent>
																{verification.streams
																	.filter((stream) =>
																		row.paymentType === "WAGE"
																			? stream.accountType === "DEBIT"
																			: stream.accountType === "CREDIT",
																	)
																	.map((stream) => (
																		<SelectItem
																			key={stream.id}
																			value={stream.id}
																		>
																			{stream.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
														<Select
															value={row.itemId ?? "__none"}
															disabled={Boolean(row.skip) || !row.streamId}
															onValueChange={(value) =>
																updateRow(row.lineNumber, {
																	itemId: value === "__none" ? null : value,
																})
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Optional item" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="__none">
																	No finance item
																</SelectItem>
																{verification.items
																	.filter(
																		(item) => item.streamId === row.streamId,
																	)
																	.map((item) => (
																		<SelectItem key={item.id} value={item.id}>
																			{item.name}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</div>
												);
											})}
										</div>
									</section>
								))}
							</div>
						</div>
					) : null}

					{phase === "import" ? (
						<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-5 px-4 py-8 sm:px-6">
							<div className="flex items-center gap-3">
								{jobFinished ? (
									<CheckCircle2 className="h-6 w-6 text-primary" />
								) : (
									<Loader2 className="h-6 w-6 animate-spin text-primary" />
								)}
								<div>
									<h3 className="font-semibold">
										{jobFinished ? "Import complete" : "Importing payments"}
									</h3>
									<p className="text-sm text-muted-foreground">
										{job?.processedRows ?? 0} of {job?.totalRows ?? 0} rows
									</p>
								</div>
							</div>
							<Progress value={progress} />
							<div className="grid grid-cols-3 divide-x rounded-md border">
								<div className="p-4">
									<p className="text-xs text-muted-foreground">Imported</p>
									<p className="text-xl font-semibold">
										{job?.importedRows ?? 0}
									</p>
								</div>
								<div className="p-4">
									<p className="text-xs text-muted-foreground">Failed</p>
									<p className="text-xl font-semibold">
										{job?.failedRows ?? 0}
									</p>
								</div>
								<div className="p-4">
									<p className="text-xs text-muted-foreground">Amount</p>
									<p className="text-lg font-semibold">
										{formatMoney(job?.importedAmount ?? 0)}
									</p>
								</div>
							</div>
							{job?.rows.some((row) => row.status === "FAILED") ? (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>Some rows failed</AlertTitle>
									<AlertDescription>
										{job.rows
											.filter((row) => row.status === "FAILED")
											.slice(0, 8)
											.map((row) => (
												<p key={row.id}>
													Line {row.lineNumber}: {row.reason}
												</p>
											))}
									</AlertDescription>
								</Alert>
							) : null}
						</div>
					) : null}
				</div>

				{error ? (
					<div className="shrink-0 border-t px-4 py-2 sm:px-6">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				) : null}

				<Separator />
				<div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
					<Button type="button" variant="ghost" onClick={close}>
						Close
					</Button>
					<div className="flex items-center gap-2">
						{phase === "setup" ? (
							<Button
								type="button"
								className="gap-2"
								disabled={
									!raw.trim() ||
									!termId ||
									Boolean(parsed.errors.length) ||
									!parsed.rows.length ||
									verifyImport.isPending
								}
								onClick={() => void analyze()}
							>
								{verifyImport.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<FileUp className="h-4 w-4" />
								)}
								Review payments
							</Button>
						) : null}
						{phase === "review" ? (
							<>
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									disabled={verifyImport.isPending}
									onClick={() => void refreshReview()}
								>
									<RefreshCw
										className={`h-4 w-4 ${verifyImport.isPending ? "animate-spin" : ""}`}
									/>
									Recheck
								</Button>
								<Button
									type="button"
									className="gap-2"
									disabled={
										unresolvedCount > 0 ||
										!readyRows.length ||
										!termConfirmed ||
										startImport.isPending
									}
									onClick={() => void execute()}
								>
									{startImport.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Upload className="h-4 w-4" />
									)}
									Import {readyRows.length} payments
								</Button>
							</>
						) : null}
						{phase === "import" && jobFinished ? (
							<>
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={downloadResults}
								>
									<Download className="h-4 w-4" />
									Download results
								</Button>
								{job?.status === "FAILED" ||
								job?.status === "COMPLETED_WITH_FAILURES" ? (
									<Button
										type="button"
										variant="outline"
										className="gap-2"
										disabled={retryImport.isPending}
										onClick={() => void retryFailedRows()}
									>
										{retryImport.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<RotateCcw className="h-4 w-4" />
										)}
										Retry failed
									</Button>
								) : null}
								<Button type="button" onClick={reset}>
									Start new import
								</Button>
							</>
						) : null}
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
}

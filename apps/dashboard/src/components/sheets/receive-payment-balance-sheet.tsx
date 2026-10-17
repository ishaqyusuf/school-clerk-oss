"use client";

import {
	PAYMENT_METHODS,
	allocateReceivedAmount,
	formatNaira,
	invalidateStudentPaymentQueries,
	parseAmount,
	round2,
} from "@/components/finance/student-payment-allocation";
import { useStudentNameFormatter } from "@/components/student-name-format/provider";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	CheckCircle2,
	CreditCard,
	Plus,
	UserPlus,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type OtherLine = {
	key: string;
	streamName: string;
	title: string;
	amount: string;
};

type Receipt = {
	studentId: string;
	studentName: string;
	total: number;
	method: string;
	lines: { title: string; amount: number }[];
};

const today = () => format(new Date(), "yyyy-MM-dd");

/**
 * Balance-first receive flow (finance/receive-payment-simplify, direction 01):
 * pick the student, see every open fee at once, type the cash received and it
 * fills oldest-first. One receipt can cover several fees and one-off lines.
 */
export function BalanceFirstReceivePaymentSheet({
	onUseAdvanced,
}: {
	onUseAdvanced: () => void;
}) {
	const {
		receivePayment,
		receivePaymentStudentId,
		receivePaymentStudentName,
		receivePaymentChargeId,
		setParams,
	} = useReceivePaymentParams();
	const studentSheetParams = useStudentParams();
	const trpc = useTRPC();
	const qc = useQueryClient();
	const formatStudentName = useStudentNameFormatter();
	const isOpen = Boolean(receivePayment);
	const studentId = receivePaymentStudentId || "";

	const [studentSearch, setStudentSearch] = useState("");
	const [amountText, setAmountText] = useState("");
	const [allocations, setAllocations] = useState<Record<string, string>>({});
	const [otherLines, setOtherLines] = useState<OtherLine[]>([]);
	const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
	const [paymentDate, setPaymentDate] = useState(today);
	const [showDetails, setShowDetails] = useState(false);
	const [reference, setReference] = useState("");
	const [note, setNote] = useState("");
	const [receipt, setReceipt] = useState<Receipt | null>(null);
	const prefilledChargeRef = useRef<string | null>(null);
	const amountInputRef = useRef<HTMLInputElement>(null);

	const clearDraft = () => {
		setAmountText("");
		setAllocations({});
		setOtherLines([]);
		setReference("");
		setNote("");
		setShowDetails(false);
		prefilledChargeRef.current = null;
	};

	useEffect(() => {
		if (!isOpen) {
			clearDraft();
			setStudentSearch("");
			setMethod(PAYMENT_METHODS[0]);
			setPaymentDate(today());
			setReceipt(null);
		}
	}, [isOpen]);

	useEffect(() => {
		clearDraft();
	}, [studentId]);

	const { data: searchResults = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions(
			{ query: studentSearch || undefined, currentTermOnly: true },
			{ enabled: isOpen },
		),
	);

	const { data, isLoading } = useQuery(
		trpc.finance.getStudentOpenCharges.queryOptions(
			{ studentId },
			{ enabled: isOpen && Boolean(studentId) },
		),
	);
	const charges = data?.charges ?? [];

	// Opened from a specific fee row: tick that fee for its full balance.
	useEffect(() => {
		const chargeId = receivePaymentChargeId;
		if (!chargeId || prefilledChargeRef.current === chargeId) return;
		const charge = charges.find((row) => row.id === chargeId);
		if (!charge) return;
		prefilledChargeRef.current = chargeId;
		setAllocations({ [charge.id]: String(charge.outstanding) });
		setAmountText(String(charge.outstanding));
	}, [charges, receivePaymentChargeId]);

	const studentOptions = searchResults.map((student) => ({
		id: student.id,
		label: formatStudentName(student) || student.name,
		classroom: student.classroom,
		term: student.currentTermLabel,
		hasCurrentTermSheet: student.hasCurrentTermSheet,
	}));
	const selectedStudent =
		studentOptions.find((student) => student.id === studentId) ??
		(data?.student
			? {
					id: data.student.id,
					label: data.student.name,
					classroom: data.student.classroom,
					term: data.student.termLabel,
					hasCurrentTermSheet: data.student.hasCurrentTermSheet,
				}
			: undefined);

	const chargeTotal = charges.reduce(
		(sum, charge) => sum + parseAmount(allocations[charge.id]),
		0,
	);
	const otherTotal = otherLines.reduce(
		(sum, line) => sum + parseAmount(line.amount),
		0,
	);
	const total = round2(chargeTotal + otherTotal);
	const received = parseAmount(amountText);
	const excess = round2(received - total);
	const otherLinesValid = otherLines.every(
		(line) => !parseAmount(line.amount) || line.title.trim(),
	);
	const lineCount =
		charges.filter((charge) => parseAmount(allocations[charge.id]) > 0)
			.length + otherLines.filter((line) => parseAmount(line.amount) > 0).length;

	const termGroups = useMemo(() => {
		const groups: { label: string; isCurrent: boolean; rows: typeof charges }[] =
			[];
		for (const charge of charges) {
			const last = groups[groups.length - 1];
			if (last && last.label === charge.termLabel) last.rows.push(charge);
			else
				groups.push({
					label: charge.termLabel,
					isCurrent: charge.isCurrentTerm,
					rows: [charge],
				});
		}
		return groups;
	}, [charges]);
	const hasArrears = charges.some((charge) => !charge.isCurrentTerm);

	const mutation = useMutation(
		trpc.finance.receiveStudentPaymentLines.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording payment...",
					success: "Payment recorded",
					error: "Could not record payment",
				},
			},
		}),
	);

	const close = () =>
		setParams({
			receivePayment: null,
			receivePaymentStudentId: null,
			receivePaymentStudentName: null,
			receivePaymentCreatedStudentId: null,
			receivePaymentReturnTo: null,
			receivePaymentChargeId: null,
		});

	const selectStudent = (id: string | null) => {
		setReceipt(null);
		setParams({
			receivePayment: true,
			receivePaymentStudentId: id,
			receivePaymentStudentName: null,
			receivePaymentCreatedStudentId: null,
			receivePaymentReturnTo: null,
			receivePaymentChargeId: null,
		});
	};

	const openCreateStudent = (name?: string) => {
		const prefill = (name || studentSearch || receivePaymentStudentName || "").trim();
		setParams({
			receivePayment: null,
			receivePaymentStudentId: null,
			receivePaymentStudentName: prefill || null,
			receivePaymentReturnTo: "student-create",
			receivePaymentChargeId: null,
		});
		studentSheetParams.setParams({
			createStudent: true,
			createStudentPrefillName: prefill || null,
			createStudentReturnTo: "receive-payment",
		});
	};

	const applyReceived = (value: string) => {
		setAmountText(value);
		const amount = Math.max(0, parseAmount(value) - otherTotal);
		const { allocations: next } = allocateReceivedAmount(amount, charges);
		setAllocations(
			Object.fromEntries(
				Object.entries(next).map(([id, amt]) => [id, String(amt)]),
			),
		);
	};

	const syncReceived = (
		nextAllocations: Record<string, string>,
		nextOther: OtherLine[] = otherLines,
	) => {
		const sum =
			charges.reduce(
				(acc, charge) => acc + parseAmount(nextAllocations[charge.id]),
				0,
			) + nextOther.reduce((acc, line) => acc + parseAmount(line.amount), 0);
		setAmountText(sum ? String(round2(sum)) : "");
	};

	const setChargeAmount = (chargeId: string, value: string, max: number) => {
		const amount = parseAmount(value);
		const next = {
			...allocations,
			[chargeId]: amount > max ? String(max) : value,
		};
		setAllocations(next);
		syncReceived(next);
	};

	const toggleCharge = (chargeId: string, checked: boolean, max: number) => {
		const next = { ...allocations };
		if (checked) next[chargeId] = String(max);
		else delete next[chargeId];
		setAllocations(next);
		syncReceived(next);
	};

	const updateOtherLine = (key: string, patch: Partial<OtherLine>) => {
		const next = otherLines.map((line) =>
			line.key === key ? { ...line, ...patch } : line,
		);
		setOtherLines(next);
		if ("amount" in patch) syncReceived(allocations, next);
	};

	const removeOtherLine = (key: string) => {
		const next = otherLines.filter((line) => line.key !== key);
		setOtherLines(next);
		syncReceived(allocations, next);
	};

	const canSubmit =
		Boolean(studentId) &&
		total > 0 &&
		excess <= 0.009 &&
		otherLinesValid &&
		!mutation.isPending;

	const submit = async () => {
		if (!canSubmit || !selectedStudent) return;
		const lines = charges
			.filter((charge) => parseAmount(allocations[charge.id]) > 0)
			.map((charge) => ({
				chargeId: charge.id,
				amount: Math.min(parseAmount(allocations[charge.id]), charge.outstanding),
				title: charge.title,
			}));
		const others = otherLines
			.filter((line) => parseAmount(line.amount) > 0)
			.map((line) => ({
				streamName: line.streamName.trim() || "Other Collections",
				title: line.title.trim(),
				amount: parseAmount(line.amount),
			}));
		const result = await mutation.mutateAsync({
			studentId,
			lines: lines.map(({ chargeId, amount }) => ({ chargeId, amount })),
			otherLines: others,
			method,
			paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00`) : null,
			reference: reference.trim() || null,
			note: note.trim() || null,
		});
		await invalidateStudentPaymentQueries(qc, trpc);
		setReceipt({
			studentId,
			studentName: selectedStudent.label,
			total: result.totalAllocated,
			method,
			lines: [
				...lines.map((line) => ({ title: line.title, amount: line.amount })),
				...others.map((line) => ({ title: line.title, amount: line.amount })),
			],
		});
		clearDraft();
	};

	const firstName = (receipt?.studentName ?? "").split(" ")[0] || "student";

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
			<SheetContent className="flex h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-[640px]">
				<SheetHeader className="shrink-0 border-b px-6 py-4">
					<div className="flex items-center justify-between gap-3">
						<SheetTitle>Receive Student Payment</SheetTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onUseAdvanced}
						>
							Advanced
						</Button>
					</div>
				</SheetHeader>

				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
					{receipt ? (
						<div className="space-y-4 py-2 text-center">
							<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-status-success-border bg-status-success-bg text-status-success-fg">
								<CheckCircle2 className="h-6 w-6" />
							</div>
							<div>
								<p className="font-semibold text-base">Payment recorded</p>
								<p className="text-muted-foreground text-sm">
									{receipt.studentName} · {receipt.method}
								</p>
							</div>
							<div className="mx-auto max-w-md text-left">
								{receipt.lines.map((line) => (
									<div
										key={line.title}
										className="flex justify-between border-b border-dashed py-2 text-sm"
									>
										<span>{line.title}</span>
										<span className="font-mono tabular-nums">
											{formatNaira(line.amount)}
										</span>
									</div>
								))}
								<div className="flex justify-between py-2 font-semibold text-sm">
									<span>Total received</span>
									<span className="font-mono tabular-nums">
										{formatNaira(receipt.total)}
									</span>
								</div>
								{receipt.studentId === studentId && data ? (
									<div className="flex justify-between text-muted-foreground text-sm">
										<span>Still owing</span>
										<span className="font-mono tabular-nums">
											{formatNaira(data.totalOutstanding)}
										</span>
									</div>
								) : null}
							</div>
							<div className="flex flex-wrap justify-center gap-2 pt-2">
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={() => {
										setReceipt(null);
										setTimeout(() => amountInputRef.current?.focus(), 0);
									}}
								>
									<Plus className="h-4 w-4" />
									Another for {firstName}
								</Button>
								<Button
									type="button"
									className="gap-2"
									onClick={() => selectStudent(null)}
								>
									<UserPlus className="h-4 w-4" />
									Next student
								</Button>
							</div>
						</div>
					) : (
						<>
							<div className="space-y-2">
								<Label>Student</Label>
								<div>
									<ComboboxDropdown
										items={studentOptions}
										selectedItem={selectedStudent}
										placeholder="Search by student name"
										searchPlaceholder="Search by student name..."
										onSearch={setStudentSearch}
										onSelect={(student) => {
											selectStudent(student.id);
											setTimeout(() => amountInputRef.current?.focus(), 50);
										}}
										onCreate={(value) => openCreateStudent(value)}
										renderOnCreate={(value) => (
											<div className="flex items-center gap-2 text-primary">
												<UserPlus className="h-4 w-4" />
												<span>Create student "{value}"</span>
											</div>
										)}
										renderSelectedItem={(student) => <span>{student.label}</span>}
										renderListItem={({ item }) => (
											<div className="flex w-full items-center justify-between gap-3">
												<div className="flex flex-col">
													<span className="font-medium">{item.label}</span>
													<span className="text-muted-foreground text-xs">
														{[item.classroom, item.term]
															.filter(Boolean)
															.join(" • ") || "No term sheet yet"}
													</span>
												</div>
												{!item.hasCurrentTermSheet ? (
													<Badge variant="outline">No current sheet</Badge>
												) : null}
											</div>
										)}
									/>
								</div>
							</div>

							{selectedStudent ? (
								<div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold">{selectedStudent.label}</p>
										<p className="truncate text-muted-foreground text-xs">
											{[selectedStudent.classroom, selectedStudent.term]
												.filter(Boolean)
												.join(" • ") || "No active term sheet"}
										</p>
									</div>
									<div className="text-right">
										<p className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.07em]">
											Outstanding
										</p>
										<p className="font-mono font-semibold text-lg tabular-nums">
											{isLoading ? "…" : formatNaira(data?.totalOutstanding ?? 0)}
										</p>
									</div>
								</div>
							) : null}

							{selectedStudent ? (
								<section className="space-y-2">
									<SectionTitle step={1}>Amount received</SectionTitle>
									<label className="flex h-13 items-center rounded-md border border-input bg-background px-4 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
										<span className="mr-2 font-mono text-muted-foreground">NGN</span>
										<input
											ref={amountInputRef}
											inputMode="decimal"
											aria-label="Amount received"
											className="h-12 w-full bg-transparent font-mono font-semibold text-2xl tabular-nums outline-none"
											placeholder="0"
											value={amountText}
											onChange={(event) => applyReceived(event.target.value)}
										/>
									</label>
									{charges.length ? (
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													applyReceived(String(data?.totalOutstanding ?? 0))
												}
											>
												Full balance · {formatNaira(data?.totalOutstanding ?? 0)}
											</Button>
											{charges
												.filter((charge) => charge.isCurrentTerm)
												.slice(0, 2)
												.map((charge) => (
													<Button
														key={charge.id}
														type="button"
														variant="outline"
														size="sm"
														onClick={() => {
															const next = { [charge.id]: String(charge.outstanding) };
															setAllocations(next);
															setOtherLines([]);
															setAmountText(String(charge.outstanding));
														}}
													>
														{charge.title} only
													</Button>
												))}
										</div>
									) : null}
								</section>
							) : null}

							{selectedStudent ? (
								<section className="space-y-2">
									<SectionTitle
										step={2}
										aside={
											charges.length
												? hasArrears
													? "Arrears are cleared first"
													: "Required fees first"
												: undefined
										}
									>
										Applied to
									</SectionTitle>
									{isLoading ? (
										<p className="text-muted-foreground text-sm">Loading fees…</p>
									) : !charges.length && !otherLines.length ? (
										<p className="rounded-md border border-dashed px-4 py-3 text-muted-foreground text-sm">
											No outstanding fees. Add an other payment for a one-off
											collection.
										</p>
									) : (
										<div className="overflow-hidden rounded-md border">
											{termGroups.map((group) => (
												<div key={group.label}>
													<div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5">
														<span className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.07em]">
															{group.label}
														</span>
														<Badge variant={group.isCurrent ? "info" : "warning"}>
															{group.isCurrent ? "Current" : "Arrears"}
														</Badge>
													</div>
													{group.rows.map((charge) => {
														const value = allocations[charge.id] ?? "";
														const on = parseAmount(value) > 0;
														return (
															<div
																key={charge.id}
																className={cn(
																	"grid grid-cols-[20px_minmax(0,1fr)_auto_112px] items-center gap-3 border-b px-3 py-2.5 last:border-b-0",
																	on && "bg-accent/50",
																)}
															>
																<Checkbox
																	checked={on}
																	aria-label={`Pay ${charge.title}`}
																	onCheckedChange={(checked) =>
																		toggleCharge(charge.id, checked === true, charge.outstanding)
																	}
																/>
																<div className="min-w-0">
																	<p className="truncate font-medium text-sm">{charge.title}</p>
																	<div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
																		<span>{charge.streamName}</span>·
																		<span>{charge.required ? "Required" : "Optional"}</span>
																		{charge.amountPaid > 0 ? (
																			<Badge variant="warning">
																				Paid {formatNaira(charge.amountPaid)}
																			</Badge>
																		) : null}
																	</div>
																</div>
																<p className="text-right font-mono text-muted-foreground text-xs tabular-nums">
																	{formatNaira(charge.outstanding)}
																	<span className="block text-[10.5px]">due</span>
																</p>
																<Input
																	inputMode="decimal"
																	aria-label={`Pay now for ${charge.title}`}
																	className="h-8 text-right font-mono tabular-nums"
																	placeholder="0"
																	value={value}
																	onChange={(event) =>
																		setChargeAmount(
																			charge.id,
																			event.target.value,
																			charge.outstanding,
																		)
																	}
																/>
															</div>
														);
													})}
												</div>
											))}
											{otherLines.map((line) => (
												<div
													key={line.key}
													className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_112px_32px] items-center gap-2 border-t px-3 py-2.5"
												>
													<Input
														aria-label="Payment type"
														className="h-8"
														placeholder="Type e.g. Uniform"
														value={line.streamName}
														onChange={(event) =>
															updateOtherLine(line.key, { streamName: event.target.value })
														}
													/>
													<Input
														aria-label="What it is for"
														className="h-8"
														placeholder="What it is for"
														value={line.title}
														onChange={(event) =>
															updateOtherLine(line.key, { title: event.target.value })
														}
													/>
													<Input
														inputMode="decimal"
														aria-label="Other payment amount"
														className="h-8 text-right font-mono tabular-nums"
														placeholder="0"
														value={line.amount}
														onChange={(event) =>
															updateOtherLine(line.key, { amount: event.target.value })
														}
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														aria-label="Remove other payment"
														onClick={() => removeOtherLine(line.key)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}
									<Button
										type="button"
										variant="link"
										className="h-auto gap-1.5 px-0"
										onClick={() =>
											setOtherLines((lines) => [
												...lines,
												{
													key: crypto.randomUUID(),
													streamName: "",
													title: "",
													amount: "",
												},
											])
										}
									>
										<Plus className="h-3.5 w-3.5" />
										Other payment (not on the list)
									</Button>
									{excess > 0.009 ? (
										<Alert className="border-status-warning-border bg-status-warning-bg text-status-warning-fg">
											<AlertDescription className="text-status-warning-fg">
												{formatNaira(excess)} is more than the selected fees.
												Tick another fee or add an other payment — overpayments
												can't be held as credit.
											</AlertDescription>
										</Alert>
									) : null}
									{!otherLinesValid ? (
										<p className="text-destructive text-xs">
											Describe what each other payment is for.
										</p>
									) : null}
								</section>
							) : null}

							{selectedStudent ? (
								<section className="space-y-3">
									<SectionTitle step={3}>How they paid</SectionTitle>
									<div className="flex flex-wrap gap-2" role="group" aria-label="Payment method">
										{PAYMENT_METHODS.map((option) => (
											<Button
												key={option}
												type="button"
												variant={method === option ? "secondary" : "outline"}
												size="sm"
												aria-pressed={method === option}
												className={cn(method === option && "ring-1 ring-primary")}
												onClick={() => setMethod(option)}
											>
												{option}
											</Button>
										))}
									</div>
									<div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
										<div className="space-y-1.5">
											<Label htmlFor="receive-payment-date">Payment date</Label>
											<Input
												id="receive-payment-date"
												type="date"
												value={paymentDate}
												onChange={(event) => setPaymentDate(event.target.value)}
											/>
										</div>
										{showDetails ? (
											<>
												<div className="space-y-1.5">
													<Label htmlFor="receive-payment-reference">Reference</Label>
													<Input
														id="receive-payment-reference"
														placeholder="TRX-00123"
														value={reference}
														onChange={(event) => setReference(event.target.value)}
													/>
												</div>
												<div className="space-y-1.5">
													<Label htmlFor="receive-payment-note">Note</Label>
													<Input
														id="receive-payment-note"
														placeholder="Optional note"
														value={note}
														onChange={(event) => setNote(event.target.value)}
													/>
												</div>
											</>
										) : (
											<Button
												type="button"
												variant="link"
												className="h-9 justify-start gap-1.5 px-0"
												onClick={() => setShowDetails(true)}
											>
												<Plus className="h-3.5 w-3.5" />
												Reference or note
											</Button>
										)}
									</div>
								</section>
							) : null}
						</>
					)}
				</div>

				{receipt ? null : (
					<div className="shrink-0 border-t bg-background/95 px-6 py-3">
						<div className="flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<p className="font-mono font-semibold text-base tabular-nums">
									{formatNaira(total)}
								</p>
								<p className="truncate text-muted-foreground text-xs">
									{selectedStudent
										? `${lineCount} fee line${lineCount === 1 ? "" : "s"} · ${method}`
										: "Select a student"}
								</p>
							</div>
							<Button type="button" variant="outline" onClick={close}>
								Cancel
							</Button>
							<Button
								type="button"
								className="gap-2"
								disabled={!canSubmit}
								onClick={() => void submit()}
							>
								<CreditCard className="h-4 w-4" />
								<span className="sm:hidden">Confirm</span>
								<span className="hidden sm:inline">Confirm payment</span>
							</Button>
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

function SectionTitle({
	step,
	aside,
	children,
}: {
	step: number;
	aside?: string;
	children: React.ReactNode;
}) {
	return (
		<h3 className="flex items-center gap-2 font-semibold text-sm">
			<span className="flex h-[18px] w-[18px] items-center justify-center rounded-sm bg-secondary font-mono text-[10.5px] text-secondary-foreground">
				{step}
			</span>
			{children}
			{aside ? (
				<span className="ml-auto font-normal text-muted-foreground text-xs">
					{aside}
				</span>
			) : null}
		</h3>
	);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	BookOpen,
	Calendar,
	CheckCircle2,
	CreditCard,
	Plus,
	Search,
	Trash2,
	UserPlus,
	Wand2,
} from "lucide-react";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { cn } from "@school-clerk/ui/cn";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";

type SelectionState = Record<string, { selected: boolean; amount: string }>;

type ReceiptState = {
	paymentIds: string[];
	count: number;
	totalAllocated: number;
};

type StreamOption = {
	id: string;
	label: string;
	name: string;
	type?: string | null;
	defaultType?: string | null;
};

type PayableRow = {
	key: string;
	source: "studentFee" | "feeHistory" | "manual" | "billable";
	studentTermFormId: string;
	studentFeeId?: string | null;
	billableHistoryId?: string | null;
	feeHistoryId?: string | null;
	title: string;
	description?: string | null;
	amount: number;
	paidAmount?: number;
	pendingAmount: number;
	status: "PAID" | "PARTIAL" | "PENDING" | "UNAPPLIED" | "NEW";
	streamId?: string | null;
	streamName?: string | null;
	classroomNames?: string[];
};

type TermData = {
	id: string;
	sessionTermId: string;
	schoolSessionId: string;
	title: string;
	sessionTitle?: string | null;
	label: string;
	classroomName?: string | null;
	isCurrent: boolean;
	rows: PayableRow[];
	totals: {
		totalDue: number;
		totalPaid: number;
		totalPending: number;
	};
};

type ManualStreamRow = {
	id: string;
	studentTermFormId: string;
	streamId: string | null;
	description: string;
	payableAmount: string;
	amount: string;
};

type AutoGroup = {
	id: string;
	memberKeys: string[];
	defaultStreamId: string | null;
	defaultStreamName: string | null;
	description: string;
	payableAmount: number;
	amount: number;
	termLabels: string[];
};

type PurchaseSuggestion = {
	id: string;
	label: string;
	description?: string | null;
	amount?: number | null;
};

const paymentMethods = [
	"Bank Transfer",
	"Cash",
	"POS / Card",
	"Cheque",
];

function formatCurrency(amount: number) {
	return `NGN ${Number(amount || 0).toLocaleString()}`;
}

function clampAmount(value: number, max: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(value, max));
}

function isPurchaseAutocompleteStream(name?: string | null) {
	return /book|uniform|store|stationery|kit|textbook|exercise|library/i.test(
		name || "",
	);
}

function toNumber(value: string | number | null | undefined) {
	return Number(value || 0);
}

export function ReceivePaymentSheet() {
	const {
		receivePayment: receivePaymentOpen,
		receivePaymentStudentId,
		receivePaymentStudentName,
		setParams,
	} = useReceivePaymentParams();
	const studentSheetParams = useStudentParams();
	const isOpen = Boolean(receivePaymentOpen);
	const selectedStudentId = receivePaymentStudentId || "";
	const trpc = useTRPC();
	const qc = useQueryClient();

	const [studentSearch, setStudentSearch] = useState("");
	const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
	const [paymentDate, setPaymentDate] = useState(
		format(new Date(), "yyyy-MM-dd"),
	);
	const [reference, setReference] = useState("");
	const [amountReceived, setAmountReceived] = useState("");
	const [selection, setSelection] = useState<SelectionState>({});
	const [openTermId, setOpenTermId] = useState<string | null>(null);
	const [manualRows, setManualRows] = useState<ManualStreamRow[]>([]);
	const [autoOverrides, setAutoOverrides] = useState<
		Record<string, { streamId?: string | null; description?: string }>
	>({});
	const [purchaseSearch, setPurchaseSearch] = useState("");
	const [receiptState, setReceiptState] = useState<ReceiptState | null>(null);

	const resetPaymentMeta = () => {
		setPaymentMethod(paymentMethods[0]);
		setPaymentDate(format(new Date(), "yyyy-MM-dd"));
		setReference("");
		setAmountReceived("");
		setReceiptState(null);
	};

	const resetAllocationState = () => {
		setSelection({});
		setOpenTermId(null);
		setManualRows([]);
		setAutoOverrides({});
	};

	useEffect(() => {
		if (!isOpen) {
			setStudentSearch("");
			setPurchaseSearch("");
			resetPaymentMeta();
			resetAllocationState();
		}
	}, [isOpen]);

	useEffect(() => {
		resetAllocationState();
	}, [selectedStudentId]);

	const { data: searchResults = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions(
			{ query: studentSearch || undefined },
			{ enabled: isOpen },
		),
	);

	const { data, isLoading } = useQuery(
		trpc.finance.getReceivePaymentData.queryOptions(
			{ studentId: selectedStudentId },
			{ enabled: isOpen && Boolean(selectedStudentId) },
		),
	);

	const { data: streamResults = [] } = useQuery(
		trpc.finance.getStreams.queryOptions(
			{ filter: "term" },
			{ enabled: isOpen },
		),
	);

	const { data: purchaseSuggestions = [] } = useQuery(
		trpc.finance.getStudentPurchaseSuggestions.queryOptions(
			{ query: purchaseSearch || undefined },
			{ enabled: isOpen },
		),
	);

	const terms = (data?.terms ?? []) as TermData[];

	useEffect(() => {
		if (!terms.length) {
			setOpenTermId(null);
			return;
		}
		if (openTermId && terms.some((term) => term.id === openTermId)) {
			return;
		}
		const firstPending =
			terms.find((term) => term.totals.totalPending > 0)?.id ??
			terms.find((term) => term.isCurrent)?.id ??
			terms[0]?.id ??
			null;
		setOpenTermId(firstPending);
	}, [openTermId, terms]);

	const studentOptions = searchResults.map((student) => ({
		id: student.id,
		label: student.name,
		classroom: student.classroom,
		term: student.currentTermLabel,
		hasCurrentTermSheet: student.hasCurrentTermSheet,
	}));

	const selectedStudent =
		studentOptions.find((student) => student.id === selectedStudentId) ||
		(data?.student
			? {
					id: data.student.id,
					label: data.student.name,
					classroom: data.student.currentClassroom,
					term: data.student.currentTerm,
					hasCurrentTermSheet: Boolean(data.currentTermForm?.id),
				}
			: undefined);

	const allRows = useMemo(() => terms.flatMap((term) => term.rows), [terms]);
	const rowMap = useMemo(
		() => new Map(allRows.map((row) => [row.key, row])),
		[allRows],
	);
	const termMap = useMemo(
		() => new Map(terms.map((term) => [term.id, term])),
		[terms],
	);

	const streamOptions = useMemo(() => {
		const merged = new Map<string, StreamOption>();

		for (const stream of streamResults) {
			merged.set(stream.id, {
				id: stream.id,
				label: stream.name,
				name: stream.name,
				type: stream.type,
				defaultType: stream.defaultType,
			});
		}

		for (const row of allRows) {
			if (row.streamId && row.streamName && !merged.has(row.streamId)) {
				merged.set(row.streamId, {
					id: row.streamId,
					label: row.streamName,
					name: row.streamName,
				});
			}
		}

		return Array.from(merged.values());
	}, [allRows, streamResults]);

	const purchaseOptions = useMemo(
		() =>
			(purchaseSuggestions ?? []).map((item) => ({
				id: item.id,
				label: item.description || item.title,
				description: item.description || item.title,
				amount: item.amount,
			})),
		[purchaseSuggestions],
	);

	const autoGroups = useMemo(() => {
		const groups = new Map<string, AutoGroup>();
		for (const row of allRows) {
			const current = selection[row.key];
			const amount = toNumber(current?.amount);
			if (!current?.selected || amount <= 0) continue;

			const defaultGroupKey =
				row.streamId || row.streamName || `ungrouped:${row.key}`;
			const id = `auto:${defaultGroupKey}`;
			const existing = groups.get(id);
			if (!existing) {
				groups.set(id, {
					id,
					memberKeys: [row.key],
					defaultStreamId: row.streamId ?? null,
					defaultStreamName: row.streamName ?? null,
					description: row.title,
					payableAmount: row.pendingAmount,
					amount,
					termLabels: [
						termMap.get(row.studentTermFormId)?.title || "Term",
					],
				});
				continue;
			}

			existing.memberKeys.push(row.key);
			existing.description = Array.from(
				new Set(
					`${existing.description}, ${row.title}`
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean),
				),
			).join(", ");
			existing.payableAmount += row.pendingAmount;
			existing.amount += amount;
			existing.termLabels = Array.from(
				new Set([
					...existing.termLabels,
					termMap.get(row.studentTermFormId)?.title || "Term",
				]),
			);
		}

		return Array.from(groups.values());
	}, [allRows, selection, termMap]);

	const totalSelected = allRows.reduce((sum, row) => {
		const current = selection[row.key];
		return sum + (current?.selected ? toNumber(current.amount) : 0);
	}, 0);
	const manualTotal = manualRows.reduce(
		(sum, row) => sum + toNumber(row.amount),
		0,
	);
	const totalAllocated = totalSelected + manualTotal;
	const amountReceivedNumber = toNumber(amountReceived);
	const amountDiff = amountReceivedNumber - totalAllocated;

	const currentTerm =
		terms.find((term) => term.id === openTermId) ??
		terms.find((term) => term.isCurrent) ??
		terms[0];

	const receivePaymentMutation = useMutation(
		trpc.finance.receiveStudentPayment.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording payment...",
					success: "Payment recorded",
					error: "Could not record payment",
				},
			},
			onSuccess(result) {
				if (!selectedStudentId) return;
				void Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStudentPayments.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.transactions.studentAccounting.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.transactions.getStudentFees.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
					}),
				]);
				setReceiptState({
					paymentIds: result.paymentIds,
					count: result.count,
					totalAllocated: result.totalAllocated,
				});
				resetAllocationState();
				setAmountReceived("");
				setReference("");
			},
		}),
	);

	const openReceipt = (paymentIds: string[], download = false) => {
		if (!paymentIds.length) return;
		const params = new URLSearchParams({
			paymentIds: paymentIds.join(","),
		});
		if (download) params.set("download", "true");
		window.open(
			`/api/pdf/student-payment-receipt?${params.toString()}`,
			"_blank",
		);
	};

	const handleStudentSelect = (studentId: string) => {
		setReceiptState(null);
		setParams({
			receivePayment: true,
			receivePaymentStudentId: studentId,
			receivePaymentStudentName: null,
			receivePaymentCreatedStudentId: null,
			receivePaymentReturnTo: null,
		});
	};

	const openCreateStudent = (name?: string) => {
		const fallbackName = (
			name ||
			studentSearch ||
			receivePaymentStudentName ||
			""
		).trim();
		setParams({
			receivePayment: null,
			receivePaymentStudentId: null,
			receivePaymentStudentName: fallbackName || null,
			receivePaymentReturnTo: "student-create",
		});
		studentSheetParams.setParams({
			createStudent: true,
			createStudentPrefillName: fallbackName || null,
			createStudentReturnTo: "receive-payment",
		});
	};

	const toggleRow = (row: PayableRow, checked: boolean) => {
		setSelection((prev) => ({
			...prev,
			[row.key]: {
				selected: checked,
				amount: checked
					? prev[row.key]?.amount || String(row.pendingAmount)
					: "0",
			},
		}));
	};

	const updateRowAmount = (row: PayableRow, value: string) => {
		if (value === "") {
			setSelection((prev) => ({
				...prev,
				[row.key]: {
					selected: prev[row.key]?.selected ?? true,
					amount: "",
				},
			}));
			return;
		}

		const nextAmount = clampAmount(Number(value), row.pendingAmount);
		setSelection((prev) => ({
			...prev,
			[row.key]: {
				selected: true,
				amount: String(nextAmount),
			},
		}));
	};

	const autoAllocate = () => {
		let remaining = amountReceivedNumber;
		const next: SelectionState = {};

		for (const row of allRows) {
			const due = Number(row.pendingAmount || 0);
			if (remaining <= 0 || due <= 0 || row.status === "PAID") {
				next[row.key] = { selected: false, amount: "0" };
				continue;
			}
			const allocated = Math.min(due, remaining);
			next[row.key] = {
				selected: allocated > 0,
				amount: String(allocated),
			};
			remaining -= allocated;
		}

		setSelection(next);
	};

	const redistributeGroup = (groupId: string, nextAmount: number) => {
		const group = autoGroups.find((item) => item.id === groupId);
		if (!group) return;

		let remaining = clampAmount(nextAmount, group.payableAmount);
		setSelection((prev) => {
			const next = { ...prev };
			for (const memberKey of group.memberKeys) {
				const row = rowMap.get(memberKey);
				if (!row) continue;
				const allocated = Math.min(row.pendingAmount, remaining);
				next[memberKey] = {
					selected: allocated > 0,
					amount: allocated > 0 ? String(allocated) : "0",
				};
				remaining -= allocated;
			}
			return next;
		});
	};

	const addManualRow = () => {
		const fallbackTermId =
			openTermId || data?.currentTermForm?.id || terms[0]?.id || null;
		if (!fallbackTermId) return;
		setManualRows((prev) => [
			...prev,
			{
				id: `manual-${Date.now()}`,
				studentTermFormId: fallbackTermId,
				streamId: streamOptions[0]?.id ?? null,
				description: "",
				payableAmount: "",
				amount: "",
			},
		]);
	};

	const updateManualRow = (
		id: string,
		field: keyof ManualStreamRow,
		value: string | null,
	) => {
		setManualRows((prev) =>
			prev.map((row) =>
				row.id === id ? { ...row, [field]: value } : row,
			),
		);
	};

	const removeManualRow = (id: string) => {
		setManualRows((prev) => prev.filter((row) => row.id !== id));
	};

	const submit = () => {
		if (!selectedStudentId) return;

		const autoAllocations = allRows
			.map((row) => {
				const current = selection[row.key];
				if (!current?.selected) return null;
				const amountToPay = toNumber(current.amount);
				if (amountToPay <= 0) return null;

				const group = autoGroups.find((item) =>
					item.memberKeys.includes(row.key),
				);
				const override = group ? autoOverrides[group.id] : undefined;
				const effectiveStream = override?.streamId
					? streamOptions.find((stream) => stream.id === override.streamId)
					: undefined;

				return {
					source: row.source,
					studentTermFormId: row.studentTermFormId,
					studentFeeId: row.studentFeeId ?? null,
					billableHistoryId: row.billableHistoryId ?? null,
					feeHistoryId: row.feeHistoryId ?? null,
					streamId: override?.streamId ?? row.streamId ?? null,
					streamName:
						effectiveStream?.name ??
						row.streamName ??
						null,
					title: row.title,
					description: row.description ?? override?.description ?? row.title,
					amountDue: row.pendingAmount,
					amountToPay,
				};
			})
			.filter(Boolean);

		const manualAllocations = manualRows
			.filter(
				(row) =>
					toNumber(row.amount) > 0 &&
					toNumber(row.payableAmount || row.amount) > 0 &&
					row.studentTermFormId,
			)
			.map((row) => {
				const stream = streamOptions.find((item) => item.id === row.streamId);
				return {
					source: "manual" as const,
					studentTermFormId: row.studentTermFormId,
					studentFeeId: null,
					billableHistoryId: null,
					feeHistoryId: null,
					streamId: row.streamId,
					streamName: stream?.name ?? null,
					title: row.description || stream?.name || "Manual Charge",
					description: row.description || stream?.name || "Manual Charge",
					amountDue: toNumber(row.payableAmount || row.amount),
					amountToPay: toNumber(row.amount),
				};
			});

		const allocations = [...autoAllocations, ...manualAllocations];
		if (!allocations.length) return;

		receivePaymentMutation.mutate({
			studentId: selectedStudentId,
			studentTermFormId:
				currentTerm?.id || data?.currentTermForm?.id || allocations[0].studentTermFormId,
			paymentMethod,
			paymentDate: paymentDate
				? new Date(`${paymentDate}T00:00:00`)
				: undefined,
			reference: reference.trim() || undefined,
			amountReceived: amountReceivedNumber,
			allocations,
		});
	};

	const canSubmit =
		Boolean(selectedStudentId) &&
		totalAllocated > 0 &&
		amountReceivedNumber > 0 &&
		Math.abs(amountDiff) < 0.001;

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					setParams({
						receivePayment: null,
						receivePaymentStudentId: null,
						receivePaymentStudentName: null,
						receivePaymentCreatedStudentId: null,
						receivePaymentReturnTo: null,
					});
				}
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-[880px]">
				<SheetHeader>
					<SheetTitle>Receive Student Payment</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
						<div className="space-y-2">
							<Label>Select student</Label>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<ComboboxDropdown
									items={studentOptions}
									selectedItem={selectedStudent}
									placeholder="Search by student name"
									searchPlaceholder="Search by student name..."
									className="pl-2"
									onSearch={(value) => {
										setStudentSearch(value);
										if (receivePaymentStudentName && value !== receivePaymentStudentName) {
											setParams({ receivePaymentStudentName: value || null });
										}
									}}
									onSelect={(student) => handleStudentSelect(student.id)}
									onCreate={(value) => {
										setStudentSearch(value);
										openCreateStudent(value);
									}}
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
												<span className="text-xs text-muted-foreground">
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
							{!selectedStudent && (studentSearch || receivePaymentStudentName) ? (
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={() => openCreateStudent()}
								>
									<UserPlus className="h-4 w-4" />
									Create student "{(studentSearch || receivePaymentStudentName || "").trim()}"
								</Button>
							) : null}
						</div>

						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
							<div className="space-y-2">
								<Label>Amount received</Label>
								<Input
									type="number"
									min="0"
									value={amountReceived}
									onChange={(event) => setAmountReceived(event.target.value)}
									placeholder="0.00"
								/>
							</div>
							<div className="space-y-2">
								<Label>Payment method</Label>
								<Select value={paymentMethod} onValueChange={setPaymentMethod}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{paymentMethods.map((method) => (
											<SelectItem key={method} value={method}>
												{method}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label>Payment date</Label>
							<div className="relative">
								<Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									className="pl-10"
									type="date"
									value={paymentDate}
									onChange={(event) => setPaymentDate(event.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Reference</Label>
							<Input
								value={reference}
								onChange={(event) => setReference(event.target.value)}
								placeholder="TRX-00123"
							/>
						</div>
					</div>

					{selectedStudent ? (
						<Card>
							<CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h3 className="text-lg font-semibold">{selectedStudent.label}</h3>
									<p className="text-sm text-muted-foreground">
										{[data?.student?.currentClassroom, data?.student?.currentTerm]
											.filter(Boolean)
											.join(" • ") || "No active term sheet"}
									</p>
								</div>
								<div className="text-left sm:text-right">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Outstanding Across Terms
									</p>
									<p className="text-2xl font-bold">
										{formatCurrency(data?.summary?.totalPending || 0)}
									</p>
									<Button
										type="button"
										variant="link"
										className="h-auto px-0 text-sm"
										onClick={() => {
											if (!selectedStudentId || !data?.currentTermForm?.id) return;
											setParams({
												receivePayment: null,
												receivePaymentStudentId: null,
												receivePaymentStudentName: null,
												receivePaymentCreatedStudentId: null,
												receivePaymentReturnTo: null,
											});
											studentSheetParams.setParams({
												studentViewId: selectedStudentId,
												studentTermSheetId: data.currentTermForm.id,
												studentViewTermId: data.currentTermForm.sessionTermId,
												studentViewTab: "finance",
											});
										}}
									>
										Open student overview
									</Button>
								</div>
							</CardContent>
						</Card>
					) : null}

					{data?.alert ? (
						<Alert variant={data.alert.variant}>
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>{data.alert.title}</AlertTitle>
							<AlertDescription>{data.alert.description}</AlertDescription>
						</Alert>
					) : null}

					{receiptState ? (
						<Alert>
							<CheckCircle2 className="h-4 w-4" />
							<AlertTitle>Payment recorded successfully</AlertTitle>
							<AlertDescription className="space-y-3">
								<p>
									{receiptState.count} allocation
									{receiptState.count !== 1 ? "s" : ""} recorded for{" "}
									{formatCurrency(receiptState.totalAllocated)}.
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => openReceipt(receiptState.paymentIds)}
									>
										Print Receipt
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => openReceipt(receiptState.paymentIds, true)}
									>
										Download PDF
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => setReceiptState(null)}
									>
										Record another payment
									</Button>
								</div>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold">Term Payables</h3>
								<p className="text-sm text-muted-foreground">
									Select a student, expand a term, then choose the lines to collect.
								</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="gap-2"
								type="button"
								onClick={autoAllocate}
								disabled={!allRows.length || amountReceivedNumber <= 0}
							>
								<Wand2 className="h-4 w-4" />
								Auto-allocate
							</Button>
						</div>

						<div className="flex gap-3 overflow-x-auto pb-2">
							{terms.length ? (
								terms.map((term) => {
									const isOpenTerm = openTermId === term.id;
									return (
										<button
											key={term.id}
											type="button"
											onClick={() =>
												setOpenTermId((current) =>
													current === term.id ? null : term.id,
												)
											}
											className={cn(
												"min-w-[190px] rounded-lg border px-4 py-3 text-left transition-colors",
												isOpenTerm
													? "border-primary bg-primary/5 text-foreground"
													: "border-border bg-card hover:bg-muted/50",
											)}
										>
											<div className="flex items-center gap-2">
												<span className="text-sm font-semibold">{term.title}</span>
												{term.isCurrent ? (
													<Badge variant="secondary">Current</Badge>
												) : null}
											</div>
											<p className="mt-1 text-xs text-muted-foreground">
												{formatCurrency(term.totals.totalPaid)} /{" "}
												{formatCurrency(term.totals.totalDue)} paid
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{term.sessionTitle || term.classroomName || "Student term"}
											</p>
										</button>
									);
								})
							) : (
								<div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
									{isLoading
										? "Loading terms..."
										: "Select a student to load payable terms."}
								</div>
							)}
						</div>

						{currentTerm ? (
							<Card>
								<CardContent className="p-0">
									<div className="flex items-center justify-between border-b px-4 py-3">
										<div>
											<h4 className="font-semibold">{currentTerm.label}</h4>
											<p className="text-sm text-muted-foreground">
												{currentTerm.classroomName || "Term charges"}
											</p>
										</div>
										<Badge variant="outline">
											{formatCurrency(currentTerm.totals.totalPending)} pending
										</Badge>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full text-sm">
											<thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
												<tr>
													<th className="px-4 py-3">Select</th>
													<th className="px-4 py-3">Item</th>
													<th className="px-4 py-3 text-right">Payable</th>
													<th className="px-4 py-3 text-right">Paid</th>
													<th className="px-4 py-3 text-right">Pending</th>
													<th className="px-4 py-3 text-right">Pay now</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{currentTerm.rows.length ? (
													currentTerm.rows.map((row) => {
														const current = selection[row.key];
														const isPaid = row.status === "PAID";
														return (
															<tr
																key={row.key}
																className={cn(
																	current?.selected && "bg-primary/5",
																)}
															>
																<td className="px-4 py-3">
																	<Checkbox
																		checked={Boolean(current?.selected)}
																		disabled={isPaid}
																		onCheckedChange={(checked) =>
																			toggleRow(row, Boolean(checked))
																		}
																	/>
																</td>
																<td className="px-4 py-3">
																	<div className="flex flex-col gap-1">
																		<div className="flex flex-wrap items-center gap-2">
																			<span className="font-medium">{row.title}</span>
																			<Badge variant="outline">{row.status}</Badge>
																			{row.streamName ? (
																				<Badge variant="secondary">
																					{row.streamName}
																				</Badge>
																			) : null}
																		</div>
																		{row.description ? (
																			<p className="text-xs text-muted-foreground">
																				{row.description}
																			</p>
																		) : null}
																	</div>
																</td>
																<td className="px-4 py-3 text-right">
																	{formatCurrency(row.amount)}
																</td>
																<td className="px-4 py-3 text-right">
																	{formatCurrency(row.paidAmount || 0)}
																</td>
																<td className="px-4 py-3 text-right font-medium">
																	{formatCurrency(row.pendingAmount)}
																</td>
																<td className="px-4 py-3">
																	<Input
																		type="number"
																		min="0"
																		max={row.pendingAmount}
																		value={current?.amount || ""}
																		disabled={!current?.selected || isPaid}
																		onChange={(event) =>
																			updateRowAmount(row, event.target.value)
																		}
																	/>
																</td>
															</tr>
														);
													})
												) : (
													<tr>
														<td
															className="px-4 py-8 text-center text-muted-foreground"
															colSpan={6}
														>
															No payable items in this term.
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						) : null}
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold">Stream Allocations</h3>
								<p className="text-sm text-muted-foreground">
									Payable selections map into stream rows automatically. Add extra rows when needed.
								</p>
							</div>
							<Button type="button" variant="outline" className="gap-2" onClick={addManualRow}>
								<Plus className="h-4 w-4" />
								Add Stream Row
							</Button>
						</div>

						<Card>
							<CardContent className="p-0">
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
											<tr>
												<th className="px-4 py-3">Stream</th>
												<th className="px-4 py-3">Description</th>
												<th className="px-4 py-3 text-right">Payable</th>
												<th className="px-4 py-3 text-right">Amount</th>
												<th className="px-4 py-3 text-right">Action</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{!autoGroups.length && !manualRows.length ? (
												<tr>
													<td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
														No allocations yet. Select payable rows above or add a manual stream entry.
													</td>
												</tr>
											) : null}

											{autoGroups.map((group) => {
												const override = autoOverrides[group.id];
												const effectiveStreamId =
													override?.streamId ?? group.defaultStreamId ?? null;
												const effectiveStream =
													streamOptions.find((stream) => stream.id === effectiveStreamId) ??
													(group.defaultStreamName
														? {
																id: group.defaultStreamId || group.id,
																label: group.defaultStreamName,
																name: group.defaultStreamName,
															}
														: undefined);
												const effectiveDescription =
													override?.description || group.description;
												const supportsAutocomplete = isPurchaseAutocompleteStream(
													effectiveStream?.name,
												);

												return (
													<tr key={group.id} className="bg-primary/5">
														<td className="px-4 py-3 align-top">
															<div className="min-w-[220px] space-y-2">
																<ComboboxDropdown
																	items={streamOptions}
																	selectedItem={effectiveStream}
																	placeholder="Select stream"
																	searchPlaceholder="Search streams..."
																	onSelect={(stream) =>
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				streamId: stream.id,
																			},
																		}))
																	}
																/>
																<div className="flex flex-wrap gap-1">
																	<Badge variant="secondary">Auto</Badge>
																	{group.termLabels.map((label) => (
																		<Badge key={label} variant="outline">
																			{label}
																		</Badge>
																	))}
																</div>
															</div>
														</td>
														<td className="px-4 py-3 align-top">
															{supportsAutocomplete ? (
																<ComboboxDropdown
																	items={purchaseOptions}
																		selectedItem={
																			effectiveDescription
																				? {
																						id: effectiveDescription,
																						label: effectiveDescription,
																						description: effectiveDescription,
																						amount: group.amount,
																					}
																				: undefined
																		}
																	placeholder="Search book/store descriptions"
																	searchPlaceholder="Search descriptions..."
																	onSearch={setPurchaseSearch}
																	onCreate={(value) =>
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				description: value.trim(),
																			},
																		}))
																	}
																	onSelect={(item) => {
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				description: item.label,
																			},
																		}));
																		redistributeGroup(
																			group.id,
																			clampAmount(
																				Number(item.amount || 0),
																				group.payableAmount,
																			),
																		);
																	}}
																	renderOnCreate={(value) => (
																		<span>Use "{value}"</span>
																	)}
																	renderListItem={({ item }) => (
																		<div className="flex w-full items-center justify-between gap-3">
																			<div className="flex items-center gap-2">
																				<BookOpen className="h-4 w-4 text-muted-foreground" />
																				<span>{item.label}</span>
																			</div>
																			<span className="text-xs font-medium">
																				{formatCurrency(Number(item.amount || 0))}
																			</span>
																		</div>
																	)}
																/>
															) : (
																<Input
																	value={effectiveDescription}
																	onChange={(event) =>
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				description: event.target.value,
																			},
																		}))
																	}
																	placeholder="Allocation description"
																/>
															)}
														</td>
														<td className="px-4 py-3 text-right align-top font-medium">
															{formatCurrency(group.payableAmount)}
														</td>
														<td className="px-4 py-3 align-top">
															<Input
																type="number"
																min="0"
																max={group.payableAmount}
																value={String(group.amount)}
																onChange={(event) =>
																	redistributeGroup(
																		group.id,
																		Number(event.target.value || 0),
																	)
																}
															/>
														</td>
														<td className="px-4 py-3 text-right align-top text-xs text-muted-foreground">
															Grouped from {group.memberKeys.length} payable
															{group.memberKeys.length !== 1 ? "s" : ""}
														</td>
													</tr>
												);
											})}

											{manualRows.map((row) => {
												const selectedStream =
													streamOptions.find((stream) => stream.id === row.streamId) ??
													undefined;
												const supportsAutocomplete = isPurchaseAutocompleteStream(
													selectedStream?.name,
												);
												const rowTerm = termMap.get(row.studentTermFormId);
												return (
													<tr key={row.id}>
														<td className="px-4 py-3 align-top">
															<div className="min-w-[220px] space-y-2">
																<ComboboxDropdown
																	items={streamOptions}
																	selectedItem={selectedStream}
																	placeholder="Select stream"
																	searchPlaceholder="Search streams..."
																	onSelect={(stream) => {
																		updateManualRow(row.id, "streamId", stream.id);
																		if (
																			!isPurchaseAutocompleteStream(stream.name) &&
																			!row.description.trim()
																		) {
																			updateManualRow(
																				row.id,
																				"description",
																				stream.name,
																			);
																		}
																	}}
																/>
																{rowTerm ? (
																	<Badge variant="outline">{rowTerm.title}</Badge>
																) : null}
															</div>
														</td>
														<td className="px-4 py-3 align-top">
															{supportsAutocomplete ? (
																<ComboboxDropdown
																	items={purchaseOptions}
																		selectedItem={
																			row.description
																				? {
																						id: row.description,
																						label: row.description,
																						description: row.description,
																						amount: toNumber(row.amount),
																					}
																				: undefined
																		}
																	placeholder="Search book/store descriptions"
																	searchPlaceholder="Search descriptions..."
																	onSearch={setPurchaseSearch}
																	onCreate={(value) =>
																		updateManualRow(
																			row.id,
																			"description",
																			value.trim(),
																		)
																	}
																	onSelect={(item) => {
																		updateManualRow(
																			row.id,
																			"description",
																			item.label,
																		);
																		updateManualRow(
																			row.id,
																			"payableAmount",
																			String(item.amount || 0),
																		);
																		updateManualRow(
																			row.id,
																			"amount",
																			String(item.amount || 0),
																		);
																	}}
																	renderOnCreate={(value) => (
																		<span>Use "{value}"</span>
																	)}
																	renderListItem={({ item }) => (
																		<div className="flex w-full items-center justify-between gap-3">
																			<div className="flex items-center gap-2">
																				<BookOpen className="h-4 w-4 text-muted-foreground" />
																				<span>{item.label}</span>
																			</div>
																			<span className="text-xs font-medium">
																				{formatCurrency(Number(item.amount || 0))}
																			</span>
																		</div>
																	)}
																/>
															) : (
																<Input
																	value={row.description}
																	onChange={(event) =>
																		updateManualRow(
																			row.id,
																			"description",
																			event.target.value,
																		)
																	}
																	placeholder="Description"
																/>
															)}
														</td>
														<td className="px-4 py-3 align-top">
															<Input
																type="number"
																min="0"
																value={row.payableAmount}
																onChange={(event) =>
																	updateManualRow(
																		row.id,
																		"payableAmount",
																		event.target.value,
																	)
																}
																placeholder="0.00"
															/>
														</td>
														<td className="px-4 py-3 align-top">
															<Input
																type="number"
																min="0"
																value={row.amount}
																onChange={(event) =>
																	updateManualRow(
																		row.id,
																		"amount",
																		event.target.value,
																	)
																}
																placeholder="0.00"
															/>
														</td>
														<td className="px-4 py-3 text-right align-top">
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => removeManualRow(row.id)}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot className="bg-muted/20">
											<tr>
												<td className="px-4 py-3 font-semibold" colSpan={3}>
													Allocation summary
												</td>
												<td className="px-4 py-3 text-right font-semibold">
													{formatCurrency(totalAllocated)}
												</td>
												<td className="px-4 py-3" />
											</tr>
										</tfoot>
									</table>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="rounded-lg border bg-muted/20 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="text-sm font-semibold">Validation</p>
								<p className="text-sm text-muted-foreground">
									Received amount must equal the sum of stream allocations.
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Badge variant="outline">
									Selected payables: {formatCurrency(totalSelected)}
								</Badge>
								<Badge variant="outline">
									Manual rows: {formatCurrency(manualTotal)}
								</Badge>
							</div>
						</div>

						{Math.abs(amountDiff) < 0.001 && amountReceivedNumber > 0 ? (
							<div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
								<CheckCircle2 className="mt-0.5 h-4 w-4" />
								<p className="text-sm">
									Balanced. The amount received matches the allocation exactly.
								</p>
							</div>
						) : amountReceivedNumber > 0 ? (
							<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
								Allocation difference: {formatCurrency(Math.abs(amountDiff))}
							</div>
						) : null}
					</div>

					<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							The layout follows the shared shadcn primitives and theme tokens while preserving the existing receive-payment route and receipt flow.
						</p>
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setParams({
										receivePayment: null,
										receivePaymentStudentId: null,
										receivePaymentStudentName: null,
										receivePaymentCreatedStudentId: null,
										receivePaymentReturnTo: null,
									})
								}
							>
								Cancel
							</Button>
							<Button
								type="button"
								className="gap-2"
								disabled={!canSubmit || receivePaymentMutation.isPending}
								onClick={submit}
							>
								<CreditCard className="h-4 w-4" />
								Confirm payment
							</Button>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

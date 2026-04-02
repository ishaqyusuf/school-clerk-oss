"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useTRPC } from "@/trpc/client";
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
import { Textarea } from "@school-clerk/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	CreditCard,
	Plus,
	Search,
	Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";

type SelectionState = Record<string, { selected: boolean; amount: string }>;

type ManualRow = {
	key: string;
	source: "manual";
	title: string;
	description?: string;
	amount: number;
	pendingAmount: number;
	status: "NEW";
	streamName?: string | null;
};

type PaymentReceiptState = {
	paymentIds: string[];
	count: number;
	totalAllocated: number;
};

export function ReceivePaymentSheet() {
	const {
		receivePayment: receivePaymentOpen,
		receivePaymentStudentId,
		setParams,
	} = useReceivePaymentParams();
	const isOpen = Boolean(receivePaymentOpen);
	const trpc = useTRPC();
	const qc = useQueryClient();

	const [studentSearch, setStudentSearch] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
	const [paymentDate, setPaymentDate] = useState(
		format(new Date(), "yyyy-MM-dd"),
	);
	const [reference, setReference] = useState("");
	const [amountReceived, setAmountReceived] = useState("");
	const [selection, setSelection] = useState<SelectionState>({});
	const [extraBillableIds, setExtraBillableIds] = useState<string[]>([]);
	const [extraFeeHistoryIds, setExtraFeeHistoryIds] = useState<string[]>([]);
	const [manualRows, setManualRows] = useState<ManualRow[]>([]);
	const [manualTitle, setManualTitle] = useState("");
	const [manualDescription, setManualDescription] = useState("");
	const [manualAmount, setManualAmount] = useState("");
	const [receiptState, setReceiptState] = useState<PaymentReceiptState | null>(
		null,
	);
	const selectedStudentId = receivePaymentStudentId || "";

	const resetSheetState = () => {
		setSelection({});
		setExtraBillableIds([]);
		setExtraFeeHistoryIds([]);
		setManualRows([]);
		setAmountReceived("");
		setReference("");
		setPaymentMethod("Bank Transfer");
		setPaymentDate(format(new Date(), "yyyy-MM-dd"));
	};

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

	const { data: searchResults = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions(
			{
				query: studentSearch || undefined,
			},
			{ enabled: isOpen },
		),
	);

	const { data, isLoading } = useQuery(
		trpc.finance.getReceivePaymentData.queryOptions(
			{
				studentId: selectedStudentId,
			},
			{ enabled: isOpen && Boolean(selectedStudentId) },
		),
	);

	const studentOptions = searchResults.map((student) => ({
		id: student.id,
		label: student.name,
		classroom: student.classroom,
		term: student.currentTermLabel,
		hasCurrentTermSheet: student.hasCurrentTermSheet,
	}));

	const selectedStudent =
		studentOptions.find((student) => student.id === receivePaymentStudentId) ||
		(data?.student
			? {
					id: data.student.id,
					label: data.student.name,
					classroom: data.student.currentClassroom,
					term: data.student.currentTerm,
					hasCurrentTermSheet: Boolean(data.currentTermForm),
				}
			: undefined);

	const baseRows = useMemo(
		() => [...(data?.billables ?? []), ...(data?.otherCharges ?? [])],
		[data],
	);

	const addedBillableRows = useMemo(() => {
		const existingKeys = new Set(baseRows.map((row) => row.key));
		return (data?.manualBillables ?? [])
			.filter(
				(billable) =>
					extraBillableIds.includes(billable.historyId) &&
					!existingKeys.has(billable.historyId),
			)
			.map((billable) => ({
				key: billable.historyId,
				source: "billable" as const,
				studentFeeId: null,
				billableHistoryId: billable.historyId,
				title: billable.title,
				description: billable.description,
				amount: billable.amount,
				paidAmount: 0,
				pendingAmount: billable.amount,
				status: "UNAPPLIED",
				streamName: billable.streamName,
				classroomNames: billable.classroomDepartments.map(
					(department) => department.name,
				),
			}));
	}, [baseRows, data, extraBillableIds]);

	const addedFeeHistoryRows = useMemo(() => {
		const existingKeys = new Set(baseRows.map((row) => row.key));
		return (data?.manualFeeHistories ?? [])
			.filter(
				(fh) =>
					extraFeeHistoryIds.includes(fh.feeHistoryId) &&
					!existingKeys.has(fh.feeHistoryId),
			)
			.map((fh) => ({
				key: fh.feeHistoryId,
				source: "feeHistory" as const,
				studentFeeId: null as string | null,
				billableHistoryId: null as string | null,
				feeHistoryId: fh.feeHistoryId,
				title: fh.title,
				description: fh.description,
				amount: fh.amount,
				paidAmount: 0,
				pendingAmount: fh.amount,
				status: "UNAPPLIED",
				streamName: fh.streamName,
				classroomNames: [] as string[],
			}));
	}, [baseRows, data, extraFeeHistoryIds]);

	const rows = useMemo(
		() => [
			...baseRows,
			...addedBillableRows,
			...addedFeeHistoryRows,
			...manualRows,
		],
		[addedBillableRows, addedFeeHistoryRows, baseRows, manualRows],
	);

	const selectedTotal = rows.reduce((sum, row) => {
		const current = selection[row.key];
		return sum + (current?.selected ? Number(current.amount || 0) : 0);
	}, 0);

	const amountReceivedNumber = Number(amountReceived || 0);
	const amountDiff = amountReceivedNumber - selectedTotal;

	const availableManualBillables = (data?.manualBillables ?? []).filter(
		(billable) =>
			!rows.some(
				(row) =>
					("billableHistoryId" in row &&
						row.billableHistoryId === billable.historyId) ||
					row.key === billable.historyId,
			),
	);

	const availableManualFeeHistories = (data?.manualFeeHistories ?? []).filter(
		(fh) => !rows.some((row) => row.key === fh.feeHistoryId),
	);

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
				if (!receivePaymentStudentId) return;
				qc.invalidateQueries({
					queryKey: trpc.finance.getReceivePaymentData.queryKey({
						studentId: receivePaymentStudentId,
					}),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getStudentPayments.queryKey({
						studentId: receivePaymentStudentId,
					}),
				});
				qc.invalidateQueries({
					queryKey: trpc.transactions.studentAccounting.queryKey({
						studentId: receivePaymentStudentId,
					}),
				});
				qc.invalidateQueries({
					queryKey: trpc.transactions.getStudentFees.queryKey(),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
				});
				setReceiptState({
					paymentIds: result.paymentIds,
					count: result.count,
					totalAllocated: result.totalAllocated,
				});
				resetSheetState();
			},
		}),
	);

	const canSubmit =
		Boolean(data?.currentTermForm?.id) &&
		amountReceivedNumber > 0 &&
		selectedTotal > 0 &&
		Math.abs(amountDiff) < 0.001;

	const toggleRow = (key: string, checked: boolean, fallbackAmount: number) => {
		setSelection((prev) => ({
			...prev,
			[key]: {
				selected: checked,
				amount: checked ? prev[key]?.amount || String(fallbackAmount) : "0",
			},
		}));
	};

	const autoAllocate = () => {
		let remaining = Number(amountReceived || 0);
		const next: SelectionState = {};
		for (const row of rows) {
			const due = Number(row.pendingAmount || 0);
			if (remaining <= 0 || due <= 0) {
				next[row.key] = { selected: false, amount: "0" };
				continue;
			}
			const allocated = Math.min(due, remaining);
			remaining -= allocated;
			next[row.key] = { selected: allocated > 0, amount: String(allocated) };
		}
		setSelection(next);
	};

	const addManualRow = () => {
		const amount = Number(manualAmount || 0);
		if (!manualTitle.trim() || amount <= 0) return;
		const key = `manual-${Date.now()}`;
		setManualRows((prev) => [
			...prev,
			{
				key,
				source: "manual",
				title: manualTitle.trim(),
				description: manualDescription.trim() || undefined,
				amount,
				pendingAmount: amount,
				status: "NEW",
			},
		]);
		setSelection((prev) => ({
			...prev,
			[key]: { selected: true, amount: String(amount) },
		}));
		setManualTitle("");
		setManualDescription("");
		setManualAmount("");
	};

	const submit = () => {
		if (!data?.currentTermForm?.id || !receivePaymentStudentId) return;
		receivePaymentMutation.mutate({
			studentId: receivePaymentStudentId,
			studentTermFormId: data.currentTermForm.id,
			paymentMethod,
			paymentDate: paymentDate
				? new Date(`${paymentDate}T00:00:00`)
				: undefined,
			reference: reference.trim() || undefined,
			amountReceived: amountReceivedNumber,
			allocations: rows
				.map((row) => {
					const current = selection[row.key];
					if (!current?.selected) return null;
					const amountToPay = Number(current.amount || 0);
					if (amountToPay <= 0) return null;
					return {
						source: row.source,
						studentFeeId: "studentFeeId" in row ? row.studentFeeId : undefined,
						billableHistoryId:
							"billableHistoryId" in row ? row.billableHistoryId : undefined,
						feeHistoryId: "feeHistoryId" in row ? row.feeHistoryId : undefined,
						title: row.title,
						description: row.description,
						amountDue: Number(row.pendingAmount || row.amount || 0),
						amountToPay,
					};
				})
				.filter(Boolean),
		});
	};

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					resetSheetState();
					setReceiptState(null);
					setParams({ receivePayment: null, receivePaymentStudentId: null });
				}
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-[760px]">
				<SheetHeader>
					<SheetTitle>Receive Student Payment</SheetTitle>
				</SheetHeader>

				<div className="mt-6 space-y-6">
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
								onSearch={setStudentSearch}
								onSelect={(student) => {
									resetSheetState();
									setReceiptState(null);
									setParams({
										receivePayment: true,
										receivePaymentStudentId: student.id,
									});
								}}
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
					</div>

					{data?.student ? (
						<Card>
							<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h3 className="text-lg font-semibold">{data.student.name}</h3>
									<p className="text-sm text-muted-foreground">
										{[data.student.currentClassroom, data.student.currentTerm]
											.filter(Boolean)
											.join(" • ") || "No active term sheet"}
									</p>
								</div>
								<div className="text-left sm:text-right">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Outstanding
									</p>
									<p className="text-2xl font-bold">
										NGN {data.summary.totalPending.toLocaleString()}
									</p>
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
									{receiptState.count !== 1 ? "s" : ""} recorded for NGN{" "}
									{receiptState.totalAllocated.toLocaleString()}.
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

					<div className="grid gap-4 md:grid-cols-2">
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
							<Label>Payment method</Label>
							<Select value={paymentMethod} onValueChange={setPaymentMethod}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
									<SelectItem value="Cash">Cash</SelectItem>
									<SelectItem value="POS / Card">POS / Card</SelectItem>
									<SelectItem value="Cheque">Cheque</SelectItem>
								</SelectContent>
							</Select>
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

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">Allocate payment</h3>
							<Button
								variant="ghost"
								size="sm"
								className="gap-2"
								type="button"
								onClick={autoAllocate}
							>
								<Wand2 className="h-4 w-4" />
								Auto-allocate
							</Button>
						</div>

						<div className="overflow-hidden rounded-lg border">
							<table className="w-full text-sm">
								<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
									<tr>
										<th className="px-4 py-3">Select</th>
										<th className="px-4 py-3">Charge</th>
										<th className="px-4 py-3 text-right">Pending</th>
										<th className="px-4 py-3 text-right">Pay</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{rows.length ? (
										rows.map((row) => {
											const current = selection[row.key];
											const isPaid = Number(row.pendingAmount || 0) <= 0;
											return (
												<tr key={row.key}>
													<td className="px-4 py-3">
														<Checkbox
															checked={Boolean(current?.selected)}
															disabled={isPaid}
															onCheckedChange={(checked) =>
																toggleRow(
																	row.key,
																	Boolean(checked),
																	row.pendingAmount,
																)
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
															{"classroomNames" in row &&
															row.classroomNames?.length ? (
																<p className="text-xs text-muted-foreground">
																	{row.classroomNames.join(", ")}
																</p>
															) : null}
														</div>
													</td>
													<td className="px-4 py-3 text-right font-medium">
														NGN{" "}
														{Number(row.pendingAmount || 0).toLocaleString()}
													</td>
													<td className="px-4 py-3">
														<Input
															type="number"
															min="0"
															max={row.pendingAmount}
															value={current?.amount || ""}
															disabled={!current?.selected || isPaid}
															onChange={(event) =>
																setSelection((prev) => ({
																	...prev,
																	[row.key]: {
																		selected: prev[row.key]?.selected ?? true,
																		amount: event.target.value,
																	},
																}))
															}
														/>
													</td>
												</tr>
											);
										})
									) : (
										<tr>
											<td
												className="px-4 py-6 text-center text-muted-foreground"
												colSpan={4}
											>
												{isLoading
													? "Loading bills..."
													: "Select a student to load current bills."}
											</td>
										</tr>
									)}
								</tbody>
								<tfoot className="bg-primary/5">
									<tr>
										<td className="px-4 py-3 font-semibold" colSpan={2}>
											Allocation summary
										</td>
										<td className="px-4 py-3 text-right text-muted-foreground">
											Received
										</td>
										<td className="px-4 py-3 text-right font-semibold">
											NGN {amountReceivedNumber.toLocaleString()}
										</td>
									</tr>
									<tr>
										<td className="px-4 py-3" colSpan={2} />
										<td className="px-4 py-3 text-right text-muted-foreground">
											Allocated
										</td>
										<td className="px-4 py-3 text-right font-semibold">
											NGN {selectedTotal.toLocaleString()}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>

						{Math.abs(amountDiff) < 0.001 && amountReceivedNumber > 0 ? (
							<div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
								<CheckCircle2 className="mt-0.5 h-4 w-4" />
								<p className="text-sm">
									Perfect match. The allocation matches the amount received.
								</p>
							</div>
						) : amountReceivedNumber > 0 ? (
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
								Allocation difference: NGN{" "}
								{Math.abs(amountDiff).toLocaleString()}
							</div>
						) : null}
					</div>

					<div className="grid gap-4 lg:grid-cols-3">
						<Card>
							<CardContent className="space-y-3 p-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">
										Add legacy billable charge
									</h3>
									<Badge variant="secondary">
										{availableManualBillables.length}
									</Badge>
								</div>
								<ComboboxDropdown
									items={availableManualBillables.map((billable) => ({
										id: billable.historyId,
										label: billable.title,
										description: billable.description,
										amount: billable.amount,
									}))}
									placeholder="Select legacy billable"
									searchPlaceholder="Search legacy billables..."
									onSelect={(billable) =>
										setExtraBillableIds((prev) =>
											prev.includes(billable.id)
												? prev
												: [...prev, billable.id],
										)
									}
									renderListItem={({ item }) => (
										<div className="flex w-full items-center justify-between gap-3">
											<div className="flex flex-col">
												<span className="font-medium">{item.label}</span>
												<span className="text-xs text-muted-foreground">
													{item.description}
												</span>
											</div>
											<span className="text-xs font-medium">
												NGN {Number(item.amount || 0).toLocaleString()}
											</span>
										</div>
									)}
								/>
								<p className="text-sm text-muted-foreground">
									For legacy student charges only. New student fees should be
									created as school fees.
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="space-y-3 p-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">Add school fee</h3>
									<Badge variant="secondary">
										{availableManualFeeHistories.length}
									</Badge>
								</div>
								<ComboboxDropdown
									items={availableManualFeeHistories.map((fh) => ({
										id: fh.feeHistoryId,
										label: fh.title,
										description: fh.description,
										amount: fh.amount,
									}))}
									placeholder="Select fee"
									searchPlaceholder="Search fees..."
									onSelect={(fh) =>
										setExtraFeeHistoryIds((prev) =>
											prev.includes(fh.id) ? prev : [...prev, fh.id],
										)
									}
									renderListItem={({ item }) => (
										<div className="flex w-full items-center justify-between gap-3">
											<div className="flex flex-col">
												<span className="font-medium">{item.label}</span>
												{item.description && (
													<span className="text-xs text-muted-foreground">
														{item.description}
													</span>
												)}
											</div>
											<span className="text-xs font-medium">
												NGN {Number(item.amount || 0).toLocaleString()}
											</span>
										</div>
									)}
								/>
								<p className="text-sm text-muted-foreground">
									School fees applicable to this student but not yet collected.
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="space-y-3 p-4">
								<h3 className="text-sm font-semibold">
									Add inventory / manual charge
								</h3>
								<Input
									value={manualTitle}
									onChange={(event) => setManualTitle(event.target.value)}
									placeholder="Item title (e.g. Book)"
								/>
								<Input
									type="number"
									min="0"
									value={manualAmount}
									onChange={(event) => setManualAmount(event.target.value)}
									placeholder="Amount"
								/>
								<Textarea
									value={manualDescription}
									onChange={(event) => setManualDescription(event.target.value)}
									placeholder="Description (optional)"
								/>
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={addManualRow}
								>
									<Plus className="h-4 w-4" />
									Add item
								</Button>
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							Search all students, collect against current-term charges, and add
							manual sales items when needed.
						</p>
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									resetSheetState();
									setParams({
										receivePayment: null,
										receivePaymentStudentId: null,
									});
								}}
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

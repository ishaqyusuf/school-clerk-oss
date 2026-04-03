"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { TableSkeleton } from "../tables/skeleton";

import { useZodForm } from "@/hooks/use-zod-form";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import { Collapsible, CollapsibleContent } from "@school-clerk/ui/collapsible";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Form } from "@school-clerk/ui/form";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { format } from "date-fns";
import {
	AlertTriangle,
	CreditCard,
	Info,
	Plus,
	Receipt,
	Wallet,
} from "lucide-react";
import { NumericFormat } from "react-number-format";
import { z } from "zod";
import { AnimatedNumber } from "../animated-number";
import { CreateStudentBilling } from "../create-student-billing";
import { Menu } from "../menu";
import { SubmitButton } from "../submit-button";

export function StudentTransactionOverview() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Content />
		</Suspense>
	);
}

// ── Fee item row ──────────────────────────────────────────────────────────────

type FeeItemData = {
	key: string;
	title: string;
	description?: string | null;
	amount: number;
	paidAmount: number;
	pendingAmount: number;
	status: string;
	studentFeeId?: string | null;
};

const STATUS_CONFIG: Record<string, { badge: string; bar: string }> = {
	PAID: {
		badge:
			"border-green-300 text-green-700 dark:border-green-800 dark:text-green-400",
		bar: "bg-green-500",
	},
	PARTIAL: {
		badge: "border-primary text-primary",
		bar: "bg-primary",
	},
	PENDING: {
		badge:
			"border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400",
		bar: "bg-muted-foreground/30",
	},
	UNAPPLIED: {
		badge: "border-muted text-muted-foreground",
		bar: "bg-muted-foreground/20",
	},
};

function FeeItemRow({
	item,
	onCancel,
	cancelPending,
}: {
	item: FeeItemData;
	onCancel?: (id: string) => void;
	cancelPending?: boolean;
}) {
	const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
	const paidPct =
		item.amount > 0 ? Math.round((item.paidAmount / item.amount) * 100) : 0;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex justify-between text-sm">
				<div className="flex items-center gap-2">
					<span className="text-foreground font-medium">{item.title}</span>
					<Badge variant="outline" className={cn("text-[10px]", cfg.badge)}>
						{item.status}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-foreground font-bold">
						<NumericFormat
							readOnly
							value={item.amount}
							prefix="NGN "
							displayType="text"
						/>
					</span>
					{onCancel && item.studentFeeId && item.status !== "PAID" && (
						<Menu>
							<Menu.Item
								onClick={() =>
									item.studentFeeId ? onCancel(item.studentFeeId) : undefined
								}
								disabled={cancelPending}
							>
								Cancel Fee
							</Menu.Item>
						</Menu>
					)}
				</div>
			</div>
			{item.status !== "UNAPPLIED" && (
				<div className="flex items-center gap-3">
					<div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
						<div
							className={cn("h-full rounded-full transition-all", cfg.bar)}
							style={{ width: `${paidPct}%` }}
						/>
					</div>
					<span className="text-xs text-muted-foreground whitespace-nowrap">
						{item.pendingAmount === 0 ? (
							<span className="text-green-600 font-medium">Paid</span>
						) : (
							<NumericFormat
								readOnly
								value={item.pendingAmount}
								prefix="NGN "
								suffix=" pending"
								displayType="text"
							/>
						)}
					</span>
				</div>
			)}
			{item.description && (
				<p className="text-xs text-muted-foreground">{item.description}</p>
			)}
		</div>
	);
}

// ── Main Content ──────────────────────────────────────────────────────────────

function Content() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const { setParams: setReceivePaymentParams } = useReceivePaymentParams();
	const [openForm, setOpenForm] = useState<"bill" | "purchase">();
	const { activeStudentTerm, studentId } = useStudentOverviewSheet();
	const hasActiveTerm = Boolean(activeStudentTerm?.termId && studentId);

	const { data: rpData } = useQuery(
		trpc.finance.getReceivePaymentData.queryOptions(
			{ studentId: studentId ?? "" },
			{ enabled: !!studentId },
		),
	);

	const { data: payments } = useQuery(
		trpc.finance.getStudentPayments.queryOptions(
			{ studentId: studentId ?? "" },
			{ enabled: !!studentId },
		),
	);

	const { mutate: cancelFeeMutate, isPending: cancelFeePending } = useMutation(
		trpc.transactions.cancelStudentFee.mutationOptions({
			meta: {
				toastTitle: {
					error: "Something went wrong",
					loading: "Cancelling...",
					success: "Cancelled",
				},
			},
			onSuccess() {
				qc.invalidateQueries({
					queryKey: trpc.finance.getReceivePaymentData.queryKey({
						studentId,
					}),
				});
			},
		}),
	);

	const _openForm = (frm: typeof openForm) => {
		setOpenForm(frm === openForm ? undefined : frm);
	};

	const summary = rpData?.summary ?? {
		totalDue: 0,
		totalPaid: 0,
		totalPending: 0,
	};
	const paidPercentage =
		summary.totalDue > 0
			? Math.round((summary.totalPaid / summary.totalDue) * 100)
			: 0;

	const hasFees =
		(rpData?.billables?.length ?? 0) > 0 ||
		(rpData?.feeItems?.length ?? 0) > 0 ||
		(rpData?.otherCharges?.length ?? 0) > 0;

	const handleCollectPayment = () => {
		setReceivePaymentParams({
			receivePayment: true,
			receivePaymentStudentId: studentId,
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
			{/* Alert */}
			{rpData?.alert && (
				<div
					className={cn(
						"rounded-lg p-4 flex gap-3 border",
						rpData.alert.variant === "destructive"
							? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800"
							: "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800",
					)}
				>
					<AlertTriangle
						className={cn(
							"shrink-0 h-5 w-5 mt-0.5",
							rpData.alert.variant === "destructive"
								? "text-red-600 dark:text-red-400"
								: "text-yellow-600 dark:text-yellow-400",
						)}
					/>
					<div>
						<h4
							className={cn(
								"text-sm font-medium",
								rpData.alert.variant === "destructive"
									? "text-red-800 dark:text-red-300"
									: "text-yellow-800 dark:text-yellow-300",
							)}
						>
							{rpData.alert.title}
						</h4>
						<p
							className={cn(
								"text-sm mt-1",
								rpData.alert.variant === "destructive"
									? "text-red-600 dark:text-red-400"
									: "text-yellow-600 dark:text-yellow-400",
							)}
						>
							{rpData.alert.description}
						</p>
					</div>
				</div>
			)}

			{/* Header & Actions */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div className="flex flex-col gap-1">
					<h3 className="text-lg font-bold tracking-tight text-foreground">
						Financial Overview
					</h3>
				</div>
				<div className="flex gap-2 flex-wrap">
					<Button
						onClick={() => _openForm("bill")}
						variant={openForm === "bill" ? "default" : "outline"}
						size="sm"
						type="button"
					>
						<Plus className="w-4 h-4 mr-1" />
						Bill
					</Button>
					<Button
						onClick={handleCollectPayment}
						variant="outline"
						size="sm"
						type="button"
					>
						<CreditCard className="w-4 h-4 mr-1" />
						Collect Payment
					</Button>
					<Button
						onClick={() => _openForm("purchase")}
						variant={openForm === "purchase" ? "default" : "outline"}
						size="sm"
						type="button"
					>
						<Plus className="w-4 h-4 mr-1" />
						Purchase
					</Button>
				</div>
			</div>

			{/* Bill form */}
			<Collapsible open={openForm === "bill"}>
				<CollapsibleContent>
					{hasActiveTerm ? (
						<CreateStudentBilling
							termId={activeStudentTerm!.termId}
							studentId={studentId!}
							studentTermId={activeStudentTerm?.studentTermId}
						/>
					) : (
						<div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
							Student must be enrolled in an active term before new fees can be
							created.
						</div>
					)}
				</CollapsibleContent>
			</Collapsible>

			{/* Purchase form */}
			<Collapsible open={openForm === "purchase"}>
				<CollapsibleContent>
					<StudentPurchaseForm
						studentId={studentId}
						studentTermFormId={activeStudentTerm?.studentTermId}
						onSuccess={() => {
							setOpenForm(undefined);
							qc.invalidateQueries({
								queryKey: trpc.finance.getStudentPayments.queryKey({
									studentId,
								}),
							});
						}}
					/>
				</CollapsibleContent>
			</Collapsible>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Total Invoiced */}
				<Card className="bg-card rounded-xl shadow-sm">
					<CardContent className="p-5">
						<div className="flex items-center gap-3 mb-2">
							<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
								<Receipt className="w-4 h-4" />
							</div>
							<p className="text-muted-foreground text-sm font-medium">
								Total Invoiced
							</p>
						</div>
						<p className="text-foreground text-2xl font-bold">
							<AnimatedNumber value={summary.totalDue} currency="NGN" />
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							All fees and charges
						</p>
					</CardContent>
				</Card>

				{/* Total Paid */}
				<Card className="bg-card rounded-xl shadow-sm">
					<CardContent className="p-5">
						<div className="flex items-center gap-3 mb-2">
							<div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
								<Wallet className="w-4 h-4" />
							</div>
							<p className="text-muted-foreground text-sm font-medium">
								Total Paid
							</p>
						</div>
						<p className="text-foreground text-2xl font-bold">
							<AnimatedNumber value={summary.totalPaid} currency="NGN" />
						</p>
						<div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
							<div
								className="bg-green-500 h-1.5 rounded-full transition-all"
								style={{ width: `${paidPercentage}%` }}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Outstanding */}
				<Card className="bg-card rounded-xl shadow-sm border-red-100 dark:border-red-900/30 relative overflow-hidden">
					<div className="absolute right-0 top-0 h-full w-1 bg-red-500" />
					<CardContent className="p-5">
						<div className="flex items-center gap-3 mb-2">
							<div className="h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
								<AlertTriangle className="w-4 h-4" />
							</div>
							<p className="text-muted-foreground text-sm font-medium">
								Outstanding
							</p>
						</div>
						<p className="text-red-600 dark:text-red-400 text-2xl font-bold">
							<AnimatedNumber value={summary.totalPending} currency="NGN" />
						</p>
						<p className="text-xs text-red-500 mt-1 font-medium">Balance due</p>
					</CardContent>
				</Card>
			</div>

			{/* Fee Structure */}
			{hasFees && (
				<Card className="bg-card rounded-xl shadow-sm overflow-hidden">
					<div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/30">
						<h3 className="text-foreground text-base font-bold">
							Fee Structure
						</h3>
					</div>
					<div className="p-5 flex flex-col gap-4">
						{/* Service billables (BillableHistory-linked) */}
						{rpData?.billables?.map((item) => (
							<FeeItemRow
								key={item.key}
								item={{
									key: item.key,
									title: item.title,
									description: item.description,
									amount: item.amount,
									paidAmount: item.paidAmount,
									pendingAmount: item.pendingAmount,
									status: item.status,
									studentFeeId: item.studentFeeId,
								}}
								onCancel={
									item.studentFeeId
										? (id) => cancelFeeMutate({ id, reason: "" })
										: undefined
								}
								cancelPending={cancelFeePending}
							/>
						))}
						{/* School fees (FeeHistory-linked) */}
						{rpData?.feeItems?.map((item) => (
							<FeeItemRow
								key={item.key}
								item={item}
								onCancel={(id) => cancelFeeMutate({ id, reason: "" })}
								cancelPending={cancelFeePending}
							/>
						))}
						{rpData?.manualFeeHistories?.map((item) => (
							<FeeItemRow
								key={item.feeHistoryId}
								item={{
									key: item.feeHistoryId,
									title: item.title,
									description: item.description,
									amount: item.amount,
									paidAmount: 0,
									pendingAmount: item.amount,
									status: "UNAPPLIED",
								}}
							/>
						))}
						{/* Other one-off charges */}
						{rpData?.otherCharges?.map((item) => (
							<FeeItemRow
								key={item.key}
								item={{
									key: item.key,
									title: item.title,
									description: item.description,
									amount: item.amount,
									paidAmount: item.paidAmount,
									pendingAmount: item.pendingAmount,
									status: item.status,
									studentFeeId: item.studentFeeId,
								}}
								onCancel={(id) => cancelFeeMutate({ id, reason: "" })}
								cancelPending={cancelFeePending}
							/>
						))}
					</div>
				</Card>
			)}

			{/* Payment History */}
			{payments && payments.length > 0 && (
				<Card className="bg-card rounded-xl shadow-sm overflow-hidden">
					<div className="px-5 py-4 border-b border-border flex justify-between items-center">
						<h3 className="text-foreground text-base font-bold">
							Payment History
						</h3>
					</div>
					<PaymentHistoryList
						payments={payments}
						studentId={params.studentViewId}
					/>
				</Card>
			)}

			{/* Info Box */}
			<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
				<Info className="text-blue-600 dark:text-blue-400 shrink-0 h-5 w-5 mt-0.5" />
				<div>
					<h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
						Payment Information
					</h4>
					<p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
						All payment records are scoped to the current term. Use the term
						selector in the header to view payment history for other terms.
					</p>
				</div>
			</div>
		</div>
	);
}

// ── Payment History List ──────────────────────────────────────────────────────

function PaymentHistoryList({
	payments,
	studentId,
}: {
	payments: Array<{
		id: string;
		amount: number;
		status?: string | null;
		paymentType?: string | null;
		description?: string | null;
		createdAt?: Date | string | null;
		studentFee?: { feeTitle?: string | null } | null;
		walletTransaction?: {
			id?: string | null;
			transactionDate?: Date | string | null;
			status?: string | null;
		} | null;
	}>;
	studentId: string;
}) {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const openReceipt = (paymentId: string, download = false) => {
		const params = new URLSearchParams({ paymentIds: paymentId });
		if (download) {
			params.set("download", "true");
		}
		window.open(
			`/api/pdf/student-payment-receipt?${params.toString()}`,
			"_blank",
		);
	};

	const { mutate: reverse, isPending } = useMutation(
		trpc.finance.reverseStudentPayment.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Reversing payment...",
					success: "Payment reversed",
					error: "Failed to reverse",
				},
			},
			onSuccess() {
				qc.invalidateQueries({
					queryKey: trpc.finance.getStudentPayments.queryKey({ studentId }),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getReceivePaymentData.queryKey({ studentId }),
				});
			},
		}),
	);

	return (
		<div className="divide-y divide-border">
			{payments.map((p) => {
				const date = p.walletTransaction?.transactionDate || p.createdAt;
				const canReverse =
					p.status === "success" &&
					p.walletTransaction?.status === "success" &&
					p.walletTransaction?.id;

				return (
					<div
						key={p.id}
						className="py-3 px-5 flex items-center gap-3 hover:bg-muted/20 transition-colors"
					>
						<div className="flex-1">
							<p className="text-sm font-medium text-foreground">
								{p.studentFee?.feeTitle || p.paymentType || "Payment"}
							</p>
							{p.description && (
								<p className="text-xs text-muted-foreground">{p.description}</p>
							)}
							<p className="text-xs text-muted-foreground">
								{date ? format(new Date(date), "dd MMM yyyy") : ""}
							</p>
						</div>
						<div className="text-right">
							<div className="text-sm font-mono font-medium text-foreground">
								<AnimatedNumber value={p.amount} currency="NGN" />
							</div>
							<Badge
								variant="outline"
								className={cn(
									"text-xs mt-0.5",
									p.status === "success"
										? "border-green-300 text-green-600 dark:border-green-800 dark:text-green-400"
										: "border-red-300 text-red-500 dark:border-red-800 dark:text-red-400",
								)}
							>
								{p.status}
							</Badge>
						</div>
						{p.status === "success" && (
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="xs"
									type="button"
									onClick={() => openReceipt(p.id)}
								>
									Print
								</Button>
								<Button
									variant="ghost"
									size="xs"
									type="button"
									onClick={() => openReceipt(p.id, true)}
								>
									Download
								</Button>
							</div>
						)}
						{canReverse && (
							<Button
								variant="ghost"
								size="xs"
								type="button"
								disabled={isPending}
								onClick={() =>
									reverse({
										studentPaymentId: p.id,
										transactionId: p.walletTransaction.id,
									})
								}
							>
								Reverse
							</Button>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ── Student Purchase Form ─────────────────────────────────────────────────────

const purchaseSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	amount: z.number().positive(),
	paid: z.boolean().default(true),
	paymentMethod: z.string().optional().nullable(),
});

function StudentPurchaseForm({
	studentId,
	studentTermFormId,
	onSuccess,
}: {
	studentId: string;
	studentTermFormId?: string | null;
	onSuccess?: () => void;
}) {
	const trpc = useTRPC();
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [method, setMethod] = useState("Cash");
	const [description, setDescription] = useState("");
	const [purchaseSearch, setPurchaseSearch] = useState("");
	const { data: purchaseSuggestions = [] } = useQuery(
		trpc.finance.getStudentPurchaseSuggestions.queryOptions(
			{
				query: purchaseSearch || undefined,
			},
			{
				enabled: Boolean(studentTermFormId),
			},
		),
	);

	const { mutate, isPending } = useMutation(
		trpc.finance.createStudentPurchase.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording purchase...",
					success: "Purchase recorded",
					error: "Failed to record purchase",
				},
			},
			onSuccess,
		}),
	);

	const PRESETS = [
		"Uniform",
		"Textbooks",
		"Exercise Books",
		"Stationery",
		"PE Kit",
		"School Bag",
	];

	if (!studentTermFormId) {
		return (
			<div className="border border-border rounded-lg p-4 text-sm text-muted-foreground">
				Student must be enrolled in a term to record purchases.
			</div>
		);
	}

	return (
		<div className="border border-border rounded-lg p-4 bg-muted/20">
			<div className="flex flex-wrap gap-2 mb-3">
				{PRESETS.map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => setTitle(p)}
						className={cn(
							"text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors",
							title === p && "bg-accent",
						)}
					>
						{p}
					</button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="grid gap-1.5">
					<Label className="text-sm">Item</Label>
					<ComboboxDropdown
						items={purchaseSuggestions.map((item) => ({
							id: item.id,
							label: item.title,
							description: item.description,
							amount: item.amount,
						}))}
						selectedItem={
							title
								? {
										id: title,
										label: title,
										description,
										amount: Number(amount || 0),
									}
								: null
						}
						placeholder="e.g. School Uniform"
						searchPlaceholder="Search previous inventory items..."
						onSearch={setPurchaseSearch}
						onSelect={(item) => {
							setTitle(item.label);
							setDescription(item.description || "");
							setAmount(String(item.amount ?? ""));
						}}
						onCreate={(value) => {
							setTitle(value.trim());
						}}
						renderOnCreate={(value) => (
							<span>Use "{value}" as a new item</span>
						)}
						renderSelectedItem={(item) => <span>{item.label}</span>}
						renderListItem={({ item }) => (
							<div className="flex w-full items-center justify-between gap-3">
								<div className="flex flex-col">
									<span className="font-medium">{item.label}</span>
									{item.description ? (
										<span className="text-xs text-muted-foreground">
											{item.description}
										</span>
									) : null}
								</div>
								<span className="text-xs font-medium">
									NGN {Number(item.amount || 0).toLocaleString()}
								</span>
							</div>
						)}
					/>
					<p className="text-xs text-muted-foreground">
						Selecting a previous item fills title, description, and amount.
					</p>
				</div>
				<div className="grid gap-1.5">
					<Label className="text-sm">Amount (NGN)</Label>
					<input
						type="number"
						className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm"
						placeholder="0.00"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</div>
				<div className="grid gap-1.5">
					<Label className="text-sm">Payment Method</Label>
					<Select value={method} onValueChange={setMethod}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Cash">Cash</SelectItem>
							<SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
							<SelectItem value="Card">Card (POS)</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-1.5">
					<Label className="text-sm">Notes (optional)</Label>
					<input
						className="flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm"
						placeholder="Additional notes"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>
			</div>
			<div className="mt-3">
				<SubmitButton
					isSubmitting={isPending}
					disabled={!title || !amount}
					type="button"
					onClick={() =>
						mutate({
							studentId,
							studentTermFormId,
							title,
							description: description || undefined,
							amount: Number.parseFloat(amount),
							paid: true,
							paymentMethod: method,
						})
					}
				>
					Record Purchase
				</SubmitButton>
			</div>
		</div>
	);
}

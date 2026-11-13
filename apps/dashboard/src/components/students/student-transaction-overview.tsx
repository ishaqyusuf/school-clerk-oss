"use client";

import { formatNaira } from "@/components/finance/student-payment-allocation";
import { StudentChargeModal } from "@/components/modals/student-charge-modal";
import { StudentPurchaseModal } from "@/components/modals/student-purchase-modal";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { Badge, type BadgeProps } from "@school-clerk/ui/badge";
import { Button, buttonVariants } from "@school-clerk/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@school-clerk/ui/item";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	AlertTriangle,
	CreditCard,
	MoreHorizontal,
	Plus,
	ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import {
	OverviewDetails,
	OverviewMeter,
	OverviewSection,
} from "./overview-section";
import { StudentPaymentsSkeleton } from "./student-overview.loading";

type FeeRow = {
	key: string;
	title?: string | null;
	description?: string | null;
	amount?: number | null;
	paidAmount?: number | null;
	pendingAmount?: number | null;
	status?: string | null;
	studentFeeId?: string | null;
};

type PaymentRow = {
	id?: string;
	amount?: number;
	status?: string | null;
	type?: "FEE" | "PURCHASE" | null;
	paymentType?: string | null;
	description?: string | null;
	createdAt?: Date | string | null;
	studentFee?: { feeTitle?: string | null } | null;
	walletTransaction?: {
		id?: string | null;
		summary?: string | null;
		transactionDate?: Date | string | null;
		status?: string | null;
	} | null;
};

type PendingCancel =
	| { kind: "fee"; id: string; title: string }
	| { kind: "payment"; id: string; title: string; amount: number }
	| null;

const FEE_STATUS: Record<
	string,
	{ label: string; variant: BadgeProps["variant"] }
> = {
	PAID: { label: "Paid", variant: "success" },
	PARTIAL: { label: "Part paid", variant: "info" },
	PENDING: { label: "Unpaid", variant: "warning" },
	UNAPPLIED: { label: "Not applied", variant: "neutral" },
};

function paymentStatus(status?: string | null): {
	label: string;
	variant: BadgeProps["variant"];
} {
	if (status === "success") return { label: "Received", variant: "success" };
	if (status === "draft") return { label: "Draft", variant: "warning" };
	return { label: status || "Unknown", variant: "neutral" };
}

export function StudentTransactionOverview() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const { setParams: setReceivePaymentParams } = useReceivePaymentParams();
	const { activeStudentTerm, studentId } = useStudentOverviewSheet();
	const [modal, setModal] = useState<"charge" | "purchase" | null>(null);
	const [pendingCancel, setPendingCancel] = useState<PendingCancel>(null);
	const termId = activeStudentTerm?.termId ?? undefined;
	const enabled = Boolean(studentId && termId);

	const paymentData = useQuery(
		trpc.finance.getReceivePaymentData.queryOptions(
			{ studentId: studentId ?? "", termId },
			{ enabled },
		),
	);
	const paymentsQuery = useQuery(
		trpc.finance.getStudentPayments.queryOptions(
			{ studentId: studentId ?? "", termId },
			{ enabled },
		),
	);

	const refreshFinance = () => {
		qc.invalidateQueries({
			queryKey: trpc.finance.getReceivePaymentData.queryKey({ studentId }),
		});
		qc.invalidateQueries({
			queryKey: trpc.finance.getStudentPayments.queryKey({ studentId, termId }),
		});
	};

	const cancelFee = useMutation(
		trpc.transactions.cancelStudentFee.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Cancelling fee...",
					success: "Fee cancelled",
					error: "Fee could not be cancelled",
				},
			},
			onSuccess: refreshFinance,
			onSettled: () => setPendingCancel(null),
		}),
	);
	const reversePayment = useMutation(
		trpc.finance.reverseStudentPayment.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Cancelling payment...",
					success: "Payment cancelled",
					error: "Payment could not be cancelled",
				},
			},
			onSuccess: refreshFinance,
			onSettled: () => setPendingCancel(null),
		}),
	);

	if (!studentId) return null;
	if (enabled && (paymentData.isPending || paymentsQuery.isPending))
		return <StudentPaymentsSkeleton />;

	const rpData = paymentData.data;
	const payments: PaymentRow[] = paymentsQuery.data ?? [];
	const summary = rpData?.summary ?? {
		totalDue: 0,
		totalPaid: 0,
		totalPending: 0,
	};
	const paidPercentage =
		summary.totalDue > 0 ? (summary.totalPaid / summary.totalDue) * 100 : 0;
	const received = payments.filter((payment) => payment.status === "success");
	const receivedTotal = received.reduce(
		(sum, payment) => sum + (payment.amount ?? 0),
		0,
	);

	const fees: Array<FeeRow & { cancellable: boolean }> = [
		...(rpData?.feeItems ?? []).map((item) => ({
			...item,
			key: item.key,
			cancellable: true,
		})),
		...(rpData?.manualFeeHistories ?? []).map((item) => ({
			key: item.feeHistoryId,
			title: item.title,
			description: item.description,
			amount: item.amount,
			paidAmount: 0,
			pendingAmount: item.amount,
			status: "UNAPPLIED",
			cancellable: false,
		})),
		...(rpData?.otherCharges ?? []).map((item) => ({
			key: item.key,
			title: item.title,
			description: item.description,
			amount: item.amount,
			paidAmount: item.paidAmount,
			pendingAmount: item.pendingAmount,
			status: item.status,
			studentFeeId: item.studentFeeId,
			cancellable: true,
		})),
	];

	const confirmCancel = () => {
		if (!pendingCancel) return;
		if (pendingCancel.kind === "fee")
			cancelFee.mutate({ id: pendingCancel.id, reason: "" });
		else reversePayment.mutate({ paymentId: pendingCancel.id });
	};
	const cancelling = cancelFee.isPending || reversePayment.isPending;

	return (
		<div className="divide-y divide-border">
			{rpData?.alert ? (
				<div className="py-5">
					<Alert
						variant={
							rpData.alert.variant === "destructive" ? "destructive" : "warning"
						}
					>
						<AlertTriangle className="size-4" />
						<AlertTitle>{rpData.alert.title}</AlertTitle>
						<AlertDescription>{rpData.alert.description}</AlertDescription>
					</Alert>
				</div>
			) : null}

			<OverviewSection
				title="Payments"
				description={
					<>
						Charges and payments for{" "}
						<bdi className="text-foreground">
							{activeStudentTerm?.term || "the selected term"}
						</bdi>
						.
					</>
				}
			>
				<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
					<Button
						type="button"
						size="sm"
						className="col-span-2 gap-1.5"
						onClick={() =>
							setReceivePaymentParams({
								receivePayment: true,
								receivePaymentStudentId: studentId,
							})
						}
					>
						<CreditCard className="size-4" aria-hidden />
						Collect payment
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-1.5"
						disabled={!enabled}
						onClick={() => setModal("charge")}
					>
						<Plus className="size-4" aria-hidden />
						Add charge
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-1.5"
						disabled={!enabled}
						onClick={() => setModal("purchase")}
					>
						<ShoppingBag className="size-4" aria-hidden />
						Purchase
					</Button>
				</div>
			</OverviewSection>

			<div className="pb-5">
				<OverviewDetails
					size="lg"
					columns={3}
					className="pb-3"
					details={[
						{
							label: "Charged",
							value: formatNaira(summary.totalDue),
							hint: "Fees and charges this term",
						},
						{
							label: "Paid",
							value: formatNaira(receivedTotal),
							hint: `${received.length} payment${received.length === 1 ? "" : "s"} received`,
						},
						{
							label: "Outstanding",
							value: formatNaira(summary.totalPending),
							hint: summary.totalPending > 0 ? "Balance due" : "Nothing owed",
							className:
								summary.totalPending > 0
									? "text-destructive"
									: "text-status-success-fg",
						},
					]}
				/>
				<OverviewMeter
					value={paidPercentage}
					label="Share of charges paid"
					tone="success"
				/>
			</div>

			{fees.length > 0 ? (
				<OverviewSection
					title="Fees"
					description={`${fees.length} item${fees.length === 1 ? "" : "s"} this term`}
				>
					<ItemGroup className="-mx-2">
						{fees.map((fee, index) => {
							const status =
								FEE_STATUS[fee.status ?? "PENDING"] ?? FEE_STATUS.PENDING;
							const amount = fee.amount ?? 0;
							const pending = fee.pendingAmount ?? 0;
							const cancelId =
								fee.cancellable && fee.status !== "PAID"
									? fee.studentFeeId
									: null;
							return (
								<div key={fee.key}>
									{index > 0 ? <ItemSeparator /> : null}
									<Item size="sm" className="items-start">
										<ItemContent className="min-w-0 gap-2">
											<div className="flex flex-wrap items-center gap-2">
												<ItemTitle className="break-words">
													{fee.title ?? "Fee"}
												</ItemTitle>
												<Badge variant={status.variant}>{status.label}</Badge>
											</div>
											{fee.status !== "UNAPPLIED" ? (
												<OverviewMeter
													value={
														amount > 0
															? ((fee.paidAmount ?? 0) / amount) * 100
															: 0
													}
													label={`${fee.title ?? "Fee"} paid`}
													tone="success"
													className="max-w-56"
												/>
											) : null}
											<ItemDescription className="line-clamp-none">
												{fee.status === "UNAPPLIED"
													? fee.description || "Not charged to this student yet"
													: pending === 0
														? "Fully paid"
														: `${formatNaira(pending)} left${fee.description && fee.description !== fee.title ? ` · ${fee.description}` : ""}`}
											</ItemDescription>
										</ItemContent>
										<ItemActions className="gap-1">
											<span className="text-sm font-medium tabular-nums">
												{formatNaira(amount)}
											</span>
											{cancelId ? (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="size-8"
															aria-label={`Actions for ${fee.title ?? "fee"}`}
														>
															<MoreHorizontal className="size-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="text-destructive focus:text-destructive"
															onSelect={() =>
																setPendingCancel({
																	kind: "fee",
																	id: cancelId,
																	title: fee.title ?? "this fee",
																})
															}
														>
															Cancel fee
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											) : (
												<span className="size-8" aria-hidden />
											)}
										</ItemActions>
									</Item>
								</div>
							);
						})}
					</ItemGroup>
				</OverviewSection>
			) : null}

			<OverviewSection
				title="Transactions"
				description={`${payments.length} transaction${payments.length === 1 ? "" : "s"} this term`}
			>
				{payments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No payments recorded for this term yet.
					</p>
				) : (
					<PaymentList payments={payments} onCancel={setPendingCancel} />
				)}
			</OverviewSection>

			{enabled && studentId && termId ? (
				<>
					<StudentChargeModal
						open={modal === "charge"}
						onOpenChange={(open) => setModal(open ? "charge" : null)}
						studentId={studentId}
						termId={termId}
						studentTermId={activeStudentTerm?.studentTermId}
					/>
					<StudentPurchaseModal
						open={modal === "purchase"}
						onOpenChange={(open) => setModal(open ? "purchase" : null)}
						studentId={studentId}
						studentTermFormId={activeStudentTerm?.studentTermId}
						onSuccess={refreshFinance}
					/>
				</>
			) : null}

			<AlertDialog
				open={Boolean(pendingCancel)}
				onOpenChange={(open) => !open && !cancelling && setPendingCancel(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pendingCancel?.kind === "payment"
								? "Cancel this payment?"
								: "Cancel this fee?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingCancel?.kind === "payment"
								? `${formatNaira(pendingCancel.amount)} for ${pendingCancel.title} is reversed and the amount goes back onto the student's balance.`
								: `${pendingCancel?.title ?? "This fee"} is removed from this term's charges. Payments already made stay on record.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelling}>Keep it</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							disabled={cancelling}
							onClick={(event) => {
								event.preventDefault();
								confirmCancel();
							}}
						>
							{pendingCancel?.kind === "payment"
								? "Cancel payment"
								: "Cancel fee"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function PaymentList({
	payments,
	onCancel,
}: {
	payments: PaymentRow[];
	onCancel: (pending: PendingCancel) => void;
}) {
	const openReceipt = (paymentId: string, download = false) => {
		const params = new URLSearchParams({ paymentIds: paymentId });
		if (download) params.set("download", "true");
		window.open(
			`/api/pdf/student-payment-receipt?${params.toString()}`,
			"_blank",
		);
	};

	return (
		<ItemGroup className="-mx-2">
			{payments.map((payment, index) => {
				const paymentId = payment.id ?? payment.walletTransaction?.id ?? "";
				const date =
					payment.walletTransaction?.transactionDate || payment.createdAt;
				const title =
					payment.studentFee?.feeTitle || payment.paymentType || "Payment";
				const method =
					payment.description?.split("•")[0]?.trim() ||
					payment.walletTransaction?.summary?.split("•")[0]?.trim() ||
					(payment.type === "PURCHASE" ? "Purchase" : "Payment");
				const ref = (payment.walletTransaction?.id || paymentId)
					.slice(0, 8)
					.toUpperCase();
				const status = paymentStatus(payment.status);
				const canPrint = payment.status === "success" && Boolean(paymentId);
				const canReverse =
					payment.status === "success" &&
					payment.walletTransaction?.status === "success" &&
					Boolean(payment.walletTransaction?.id);

				return (
					<div key={paymentId || `${title}-${index}`}>
						{index > 0 ? <ItemSeparator /> : null}
						<Item size="sm" className="items-start">
							<ItemContent className="min-w-0">
								<ItemTitle className="break-words">{title}</ItemTitle>
								<ItemDescription className="line-clamp-none">
									{[date ? format(new Date(date), "d MMM yyyy") : null, method]
										.filter(Boolean)
										.join(" · ")}
									{ref ? <span className="font-mono"> · #{ref}</span> : null}
								</ItemDescription>
							</ItemContent>
							<ItemActions className="gap-1">
								<div className="flex flex-col items-end gap-1">
									<span className="text-sm font-medium tabular-nums">
										{formatNaira(payment.amount ?? 0)}
									</span>
									<Badge variant={status.variant}>{status.label}</Badge>
								</div>
								{canPrint || canReverse ? (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-8"
												aria-label={`Actions for ${title}`}
											>
												<MoreHorizontal className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{canPrint ? (
												<>
													<DropdownMenuItem
														onSelect={() => openReceipt(paymentId)}
													>
														Print receipt
													</DropdownMenuItem>
													<DropdownMenuItem
														onSelect={() => openReceipt(paymentId, true)}
													>
														Download receipt
													</DropdownMenuItem>
												</>
											) : null}
											{canPrint && canReverse ? (
												<DropdownMenuSeparator />
											) : null}
											{canReverse ? (
												<DropdownMenuItem
													className="text-destructive focus:text-destructive"
													onSelect={() =>
														onCancel({
															kind: "payment",
															id: paymentId,
															title,
															amount: payment.amount ?? 0,
														})
													}
												>
													Cancel payment
												</DropdownMenuItem>
											) : null}
										</DropdownMenuContent>
									</DropdownMenu>
								) : (
									<span className="size-8" aria-hidden />
								)}
							</ItemActions>
						</Item>
					</div>
				);
			})}
		</ItemGroup>
	);
}

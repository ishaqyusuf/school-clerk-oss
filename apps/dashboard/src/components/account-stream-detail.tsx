"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { format } from "date-fns";
import {
	ArrowDownRight,
	ArrowLeft,
	ArrowUpRight,
	CheckCircle2,
	CreditCard,
	FileText,
	MinusCircle,
	PlusCircle,
	ReceiptText,
	Search,
	TrendingDown,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { AnimatedNumber } from "./animated-number";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { SubmitButton } from "./submit-button";
import { formatAmount } from "@school-clerk/utils/format";

function StreamAddFundForm({
	walletId,
	onSuccess,
	onCancel,
}: {
	walletId: string;
	onSuccess: () => void;
	onCancel: () => void;
}) {
	const trpc = useTRPC();
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState("");

	const { mutate, isPending } = useMutation(
		trpc.finance.addFund.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Adding fund...",
					success: "Fund added",
					error: "Failed to add fund",
				},
			},
			onSuccess,
		}),
	);

	return (
		<Card className="border-dashed border-green-300 dark:border-green-800">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm flex items-center gap-2">
						<PlusCircle className="h-4 w-4 text-green-600" />
						Add Fund to Stream
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={onCancel}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid sm:grid-cols-4 gap-4 items-end">
					<div className="grid gap-1.5">
						<Label>Title</Label>
						<Input
							placeholder="e.g. Donation received"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Amount (NGN)</Label>
						<Input
							type="number"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Description</Label>
						<Input
							placeholder="Optional note"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Date</Label>
						<Input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex gap-2 mt-4">
					<SubmitButton
						isSubmitting={isPending}
						disabled={!title || !amount}
						onClick={() =>
							mutate({
								walletId,
								title,
								amount: Number.parseFloat(amount),
								description: description || null,
								date: date ? new Date(date) : null,
							})
						}
						type="button"
					>
						Add Fund
					</SubmitButton>
					<Button variant="ghost" type="button" onClick={onCancel}>
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function StreamWithdrawForm({
	walletId,
	onSuccess,
	onCancel,
}: {
	walletId: string;
	onSuccess: () => void;
	onCancel: () => void;
}) {
	const trpc = useTRPC();
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState("");

	const { mutate, isPending } = useMutation(
		trpc.finance.withdrawFund.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Processing withdrawal...",
					success: "Withdrawal recorded",
					error: "Failed to record withdrawal",
				},
			},
			onSuccess,
		}),
	);

	return (
		<Card className="border-dashed border-rose-300 dark:border-rose-800">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm flex items-center gap-2">
						<MinusCircle className="h-4 w-4 text-rose-600" />
						Withdraw from Stream
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={onCancel}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid sm:grid-cols-4 gap-4 items-end">
					<div className="grid gap-1.5">
						<Label>Title</Label>
						<Input
							placeholder="e.g. Cash disbursement"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Amount (NGN)</Label>
						<Input
							type="number"
							placeholder="0.00"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Description</Label>
						<Input
							placeholder="Optional note"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Date</Label>
						<Input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
				</div>
				<div className="flex gap-2 mt-4">
					<SubmitButton
						isSubmitting={isPending}
						disabled={!title || !amount}
						onClick={() =>
							mutate({
								walletId,
								title,
								amount: Number.parseFloat(amount),
								description: description || null,
								date: date ? new Date(date) : null,
							})
						}
						type="button"
					>
						Withdraw
					</SubmitButton>
					<Button variant="ghost" type="button" onClick={onCancel}>
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

const statusTone = {
	success: "bg-green-100 text-green-700 border-green-200",
	draft: "bg-slate-100 text-slate-700 border-slate-200",
	failed: "bg-rose-100 text-rose-700 border-rose-200",
	cancelled: "bg-amber-100 text-amber-700 border-amber-200",
} as const;

function humanizeStatus(status?: string | null) {
	if (!status) return "Unknown";
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function humanizeType(type?: string | null) {
	if (!type) return "Transaction";
	return type
		.split("-")
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

export function AccountStreamDetail({ streamId }: { streamId: string }) {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const router = useRouter();
	const { setParams } = useReceivePaymentParams();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [showAddFund, setShowAddFund] = useState(false);
	const [showWithdraw, setShowWithdraw] = useState(false);

	const { data } = useSuspenseQuery(
		trpc.finance.getStreamDetails.queryOptions({ streamId }),
	);

	const invalidate = () =>
		qc.invalidateQueries({
			queryKey: trpc.finance.getStreamDetails.queryKey({ streamId }),
		});

	const filteredTransactions = useMemo(() => {
		return data.transactions.filter((transaction) => {
			const matchesSearch = search
				? [
						transaction.reference,
						transaction.partyName,
						transaction.title,
						transaction.description,
					]
						.filter(Boolean)
						.some((value) =>
							value?.toLowerCase().includes(search.toLowerCase()),
						)
				: true;

			const matchesStatus =
				statusFilter === "all" ? true : transaction.status === statusFilter;

			return matchesSearch && matchesStatus;
		});
	}, [data.transactions, search, statusFilter]);

	const successfulTransactions = data.transactions.filter(
		(transaction) => transaction.status === "success",
	);
	const uniquePayers = new Set(
		data.transactions
			.map((transaction) => transaction.partyName)
			.filter((name) => name && name !== "Internal transfer" && name !== "School account"),
	).size;
	const lastTransaction = data.transactions[0] ?? null;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="space-y-2">
					<Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground">
						<Link href="/finance/streams">
							<ArrowLeft className="h-4 w-4" />
							Back to streams
						</Link>
					</Button>
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-3xl font-black tracking-tight">{data.name}</h1>
						<Badge
							variant="outline"
							className={cn(
								"uppercase tracking-[0.2em]",
								data.defaultType === "incoming"
									? "bg-emerald-50 text-emerald-700 border-emerald-200"
									: "bg-rose-50 text-rose-700 border-rose-200",
							)}
						>
							{data.defaultType === "incoming" ? "Incoming" : "Outgoing"}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						{data.periodLabel
							? `Detailed activity for ${data.periodLabel}.`
							: "Detailed activity for this account stream."}
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						className="gap-2"
						onClick={() => router.push(`/finance/transactions`)}
					>
						<FileText className="h-4 w-4" />
						All Transactions
					</Button>
					<Button
						variant="outline"
						className="gap-2"
						onClick={() => setParams({ receivePayment: true })}
					>
						<CreditCard className="h-4 w-4" />
						Receive Payment
					</Button>
					<Button
						variant={data.defaultType === "incoming" ? "default" : "outline"}
						className="gap-2"
						onClick={() => {
							setShowWithdraw(false);
							setShowAddFund(!showAddFund);
						}}
					>
						<PlusCircle className="h-4 w-4" />
						Add Fund
					</Button>
					<Button
						variant={data.defaultType === "outgoing" ? "default" : "outline"}
						className="gap-2"
						onClick={() => {
							setShowAddFund(false);
							setShowWithdraw(!showWithdraw);
						}}
					>
						<MinusCircle className="h-4 w-4" />
						Withdraw
					</Button>
				</div>
			</div>

			{showAddFund && (
				<StreamAddFundForm
					walletId={streamId}
					onSuccess={() => {
						setShowAddFund(false);
						invalidate();
					}}
					onCancel={() => setShowAddFund(false)}
				/>
			)}
			{showWithdraw && (
				<StreamWithdrawForm
					walletId={streamId}
					onSuccess={() => {
						setShowWithdraw(false);
						invalidate();
					}}
					onCancel={() => setShowWithdraw(false)}
				/>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Card className="p-5">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium text-muted-foreground">
							Available Balance
						</p>
						<div className="rounded-lg bg-blue-100 p-2 text-blue-600">
							<Wallet className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 text-2xl font-bold">
						<AnimatedNumber value={data.balance} currency="NGN" />
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						Net movement inside this stream
					</p>
				</Card>

				<Card className="p-5">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium text-muted-foreground">
							Total Inflow
						</p>
						<div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
							<TrendingUp className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 text-2xl font-bold">
						<AnimatedNumber value={data.totalIn} currency="NGN" />
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						Successful credits and transfers in
					</p>
				</Card>

				<Card className="p-5">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium text-muted-foreground">
							Total Outflow
						</p>
						<div className="rounded-lg bg-rose-100 p-2 text-rose-600">
							<TrendingDown className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 text-2xl font-bold">
						<AnimatedNumber value={data.totalOut} currency="NGN" />
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						Expenses, debits, and transfers out
					</p>
				</Card>

				<Card className="p-5">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium text-muted-foreground">
							Activity Snapshot
						</p>
						<div className="rounded-lg bg-amber-100 p-2 text-amber-600">
							<CheckCircle2 className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 text-2xl font-bold">{successfulTransactions.length}</div>
					<p className="mt-1 text-xs text-muted-foreground">
						{uniquePayers} payers, latest{" "}
						{lastTransaction?.transactionDate
							? format(new Date(lastTransaction.transactionDate), "dd MMM yyyy")
							: "activity pending"}
					</p>
				</Card>
			</div>

			<Card className="p-4">
				<div className="flex flex-col gap-4 md:flex-row md:items-center">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							className="pl-9"
							placeholder="Search by reference, payer, or note..."
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
					<select
						className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
						value={statusFilter}
						onChange={(event) => setStatusFilter(event.target.value)}
					>
						<option value="all">All statuses</option>
						<option value="success">Success</option>
						<option value="draft">Draft</option>
						<option value="failed">Failed</option>
						<option value="cancelled">Cancelled</option>
					</select>
				</div>
			</Card>

			<Card className="overflow-hidden border-border">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
							<tr>
								<th className="px-6 py-4">Date</th>
								<th className="px-6 py-4">Reference</th>
								<th className="px-6 py-4">Party</th>
								<th className="px-6 py-4">Details</th>
								<th className="px-6 py-4">Type</th>
								<th className="px-6 py-4 text-right">Amount</th>
								<th className="px-6 py-4 text-center">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filteredTransactions.map((transaction) => (
								<tr
									key={transaction.id}
									className="transition-colors hover:bg-muted/20"
								>
									<td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
										{transaction.transactionDate
											? format(
													new Date(transaction.transactionDate),
													"dd MMM yyyy",
												)
											: "—"}
									</td>
									<td className="px-6 py-4 font-medium text-primary">
										{transaction.reference}
									</td>
									<td className="px-6 py-4">
										<div className="font-medium text-foreground">
											{transaction.partyName}
										</div>
										{transaction.studentClassroom ? (
											<div className="text-xs text-muted-foreground">
												{transaction.studentClassroom}
											</div>
										) : null}
									</td>
									<td className="px-6 py-4">
										<div className="font-medium text-foreground">
											{transaction.title}
										</div>
										<div className="text-xs text-muted-foreground">
											{transaction.description || "No additional note"}
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
											{transaction.direction === "in" ? (
												<ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
											) : (
												<ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
											)}
											{humanizeType(transaction.type)}
										</div>
									</td>
									<td
										className={cn(
											"px-6 py-4 text-right font-semibold",
											transaction.direction === "in"
												? "text-emerald-700"
												: "text-rose-700",
										)}
									>
										{transaction.direction === "in" ? "+" : "-"}
										{formatAmount({
											amount: transaction.amount,
											currency: "NGN",
											locale: "en-US",
										})}
									</td>
									<td className="px-6 py-4 text-center">
										<Badge
											variant="outline"
											className={cn(
												"justify-center capitalize",
												statusTone[
													(transaction.status as keyof typeof statusTone) || "success"
												],
											)}
										>
											{humanizeStatus(transaction.status)}
										</Badge>
									</td>
								</tr>
							))}
							{filteredTransactions.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-12 text-center text-sm text-muted-foreground"
									>
										No transactions match your current filters.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
				<div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
					<span>
						Showing {filteredTransactions.length} of {data.transactions.length}{" "}
						transaction{data.transactions.length === 1 ? "" : "s"}
					</span>
					<span>
						{data.createdAt
							? `Opened ${format(new Date(data.createdAt), "dd MMM yyyy")}`
							: "Active stream"}
					</span>
				</div>
			</Card>
		</div>
	);
}

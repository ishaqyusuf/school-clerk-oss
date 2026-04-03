"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@school-clerk/ui/card";
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
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	AlertCircle,
	ArrowDownRight,
	ArrowUpRight,
	CreditCard,
	TrendingDown,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { AnimatedNumber } from "./animated-number";
import { SubmitButton } from "./submit-button";
import { TableSkeleton } from "./tables/skeleton";

export function AccountingStreams() {
	return (
		<Suspense fallback={<TableSkeleton />}>
			<Content />
		</Suspense>
	);
}

function Content() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const router = useRouter();
	const { setParams } = useReceivePaymentParams();
	const [filter, setFilter] = useState<"term" | "session">("term");
	const [showCreate, setShowCreate] = useState(false);
	const [showTransfer, setShowTransfer] = useState(false);

	const { data: streams } = useSuspenseQuery(
		trpc.finance.getStreams.queryOptions({ filter }),
	);

	const invalidate = () =>
		qc.invalidateQueries({
			queryKey: trpc.finance.getStreams.queryKey({ filter }),
		});

	const feeStreams = streams.filter((s) => s.type === "fee");
	const billStreams = streams.filter((s) => s.type !== "fee");
	const totalInflow = feeStreams.reduce((s, w) => s + w.totalIn, 0);
	const totalOutflow = billStreams.reduce((s, w) => s + w.totalOut, 0);
	const netPosition = totalInflow - totalOutflow;

	const streamColors = [
		{ color: "text-primary", bg: "bg-primary/10", bar: "bg-primary" },
		{
			color: "text-purple-600",
			bg: "bg-purple-100 dark:bg-purple-900/20",
			bar: "bg-purple-600",
		},
		{
			color: "text-indigo-600",
			bg: "bg-indigo-100 dark:bg-indigo-900/20",
			bar: "bg-indigo-600",
		},
		{
			color: "text-teal-600",
			bg: "bg-teal-100 dark:bg-teal-900/20",
			bar: "bg-teal-600",
		},
		{
			color: "text-rose-600",
			bg: "bg-rose-100 dark:bg-rose-900/20",
			bar: "bg-rose-600",
		},
		{
			color: "text-orange-600",
			bg: "bg-orange-100 dark:bg-orange-900/20",
			bar: "bg-orange-600",
		},
	];

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
				<div>
					<h1 className="text-3xl font-black tracking-tight">
						Account Streams
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage financial streams and transaction records for the current
						term.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex gap-2">
						<Button
							variant={filter === "term" ? "default" : "outline"}
							size="sm"
							onClick={() => setFilter("term")}
						>
							This Term
						</Button>
						<Button
							variant={filter === "session" ? "default" : "outline"}
							size="sm"
							onClick={() => setFilter("session")}
						>
							This Session
						</Button>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => setParams({ receivePayment: true })}
					>
						<CreditCard className="h-4 w-4" />
						Receive Payment
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => {
							setShowTransfer(!showTransfer);
							setShowCreate(false);
						}}
					>
						<ArrowUpRight className="h-4 w-4" />
						Internal Transfer
					</Button>
					<Button
						size="sm"
						className="gap-2"
						onClick={() => {
							setShowCreate(!showCreate);
							setShowTransfer(false);
						}}
					>
						Add Stream
					</Button>
				</div>
			</div>

			{/* KPI Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				<Card className="p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
							<TrendingUp className="h-5 w-5" />
						</div>
						<Badge
							variant="outline"
							className="text-xs text-green-700 border-green-200 bg-green-50"
						>
							Revenue
						</Badge>
					</div>
					<div className="mt-4">
						<p className="text-sm font-medium text-muted-foreground">
							Total Inflow
						</p>
						<h3 className="text-2xl font-bold tracking-tight mt-1">
							<AnimatedNumber value={totalInflow} currency="NGN" />
						</h3>
					</div>
				</Card>

				<Card className="p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
							<TrendingDown className="h-5 w-5" />
						</div>
						<Badge
							variant="outline"
							className="text-xs text-rose-700 border-rose-200 bg-rose-50"
						>
							Expenses
						</Badge>
					</div>
					<div className="mt-4">
						<p className="text-sm font-medium text-muted-foreground">
							Total Outflow
						</p>
						<h3 className="text-2xl font-bold tracking-tight mt-1">
							<AnimatedNumber value={totalOutflow} currency="NGN" />
						</h3>
					</div>
				</Card>

				<Card className="p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
							<Wallet className="h-5 w-5" />
						</div>
						<Badge
							variant="outline"
							className={`text-xs ${netPosition >= 0 ? "text-green-700 border-green-200 bg-green-50" : "text-rose-700 border-rose-200 bg-rose-50"}`}
						>
							{netPosition >= 0 ? "Surplus" : "Deficit"}
						</Badge>
					</div>
					<div className="mt-4">
						<p className="text-sm font-medium text-muted-foreground">
							Net Position
						</p>
						<h3 className="text-2xl font-bold tracking-tight mt-1">
							<AnimatedNumber value={Math.abs(netPosition)} currency="NGN" />
						</h3>
					</div>
				</Card>

				<Card className="p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
							<AlertCircle className="h-5 w-5" />
						</div>
						<Badge variant="outline" className="text-xs">
							{streams.length} streams
						</Badge>
					</div>
					<div className="mt-4">
						<p className="text-sm font-medium text-muted-foreground">
							Active Streams
						</p>
						<h3 className="text-2xl font-bold tracking-tight mt-1">
							{streams.length}
						</h3>
					</div>
				</Card>
			</div>

			{/* Inline forms */}
			{showCreate && (
				<CreateStreamForm
					onSuccess={() => {
						setShowCreate(false);
						invalidate();
					}}
				/>
			)}
			{showTransfer && (
				<TransferFundsForm
					streams={streams}
					onSuccess={() => {
						setShowTransfer(false);
						invalidate();
					}}
				/>
			)}

			{/* Active Streams */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold">Active Account Streams</h2>
					<span className="text-sm text-muted-foreground">
						{streams.length} total
					</span>
				</div>

				{streams.length === 0 ? (
					<Card className="p-16 flex flex-col items-center justify-center text-center">
						<AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
						<p className="font-medium text-muted-foreground">
							No accounting streams yet
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Streams are created automatically when fees or bills are recorded.
						</p>
						<Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
							Add Stream
						</Button>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{streams.map((stream, idx) => {
							const colorSet = streamColors[idx % streamColors.length];
							const isRevenue = stream.type === "fee";
							const target = Math.max(stream.totalIn, stream.totalOut, 1);
							const current = isRevenue ? stream.totalIn : stream.totalOut;
							const progress = Math.min((current / target) * 100, 100);

							return (
								<Card
									key={stream.id}
									className="p-5 flex flex-col hover:shadow-md transition-shadow cursor-pointer group"
									onClick={() =>
										router.push(
											`/finance/streams/${stream.id}`,
										)
									}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											router.push(
												`/finance/streams/${stream.id}`,
											);
										}
									}}
									role="button"
									tabIndex={0}
								>
									<div className="flex justify-between items-start mb-4">
										<div
											className={`h-10 w-10 rounded-full flex items-center justify-center ${colorSet.bg} ${colorSet.color}`}
										>
											{isRevenue ? (
												<ArrowUpRight className="h-5 w-5" />
											) : (
												<ArrowDownRight className="h-5 w-5" />
											)}
										</div>
										<span
											className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
												isRevenue
													? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
													: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
											}`}
										>
											{isRevenue ? "revenue" : "expense"}
										</span>
									</div>

									<h3 className="text-base font-bold">{stream.name}</h3>
									<div className="flex items-baseline gap-2 mt-2">
										<span className="text-2xl font-bold">
											<AnimatedNumber value={stream.balance} currency="NGN" />
										</span>
										<span className="text-xs text-muted-foreground">
											balance
										</span>
									</div>

									<div className="mt-4 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
										<div
											className={`${colorSet.bar} h-1.5 rounded-full transition-all duration-500`}
											style={{ width: `${progress}%` }}
										/>
									</div>

									<div className="flex gap-4 mt-3 text-xs text-muted-foreground">
										<span className="text-green-600">
											In:{" "}
											<AnimatedNumber value={stream.totalIn} currency="NGN" />
										</span>
										<span className="text-red-500">
											Out:{" "}
											<AnimatedNumber value={stream.totalOut} currency="NGN" />
										</span>
									</div>

									<div className="flex gap-2 mt-5 pt-4 border-t border-border">
										<Button
											variant={isRevenue ? "default" : "secondary"}
											size="sm"
											className="flex-1 text-xs font-bold"
											onClick={(event) => {
												event.stopPropagation();
												if (isRevenue) {
													setParams({ receivePayment: true });
													return;
												}
												router.push(`/finance/payments`);
											}}
										>
											{isRevenue ? "New Transaction" : "Manage Expense"}
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-xs font-bold"
											onClick={(event) => {
												event.stopPropagation();
												router.push(`/finance/streams/${stream.id}`);
											}}
										>
											Statement
										</Button>
									</div>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function CreateStreamForm({ onSuccess }: { onSuccess: () => void }) {
	const trpc = useTRPC();
	const [name, setName] = useState("");
	const [type, setType] = useState("fee");

	const { mutate, isPending } = useMutation(
		trpc.finance.createStream.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Creating stream...",
					success: "Stream created",
					error: "Failed to create stream",
				},
			},
			onSuccess,
		}),
	);

	return (
		<Card className="border-dashed">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Add New Stream</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={onSuccess}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid sm:grid-cols-3 gap-4 items-end">
					<div className="grid gap-1.5">
						<Label>Stream Name</Label>
						<Input
							placeholder="e.g. Uniform Sales"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label>Type</Label>
						<Select value={type} onValueChange={setType}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="fee">Income (Fee)</SelectItem>
								<SelectItem value="bill">Expense (Bill)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex gap-2">
						<SubmitButton
							isSubmitting={isPending}
							disabled={!name}
							onClick={() => mutate({ name, type })}
							type="button"
						>
							Create
						</SubmitButton>
						<Button variant="ghost" type="button" onClick={onSuccess}>
							Cancel
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TransferFundsForm({
	streams,
	onSuccess,
}: {
	streams: { id: string; name: string }[];
	onSuccess: () => void;
}) {
	const trpc = useTRPC();
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");

	const { mutate, isPending } = useMutation(
		trpc.finance.transferFunds.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Transferring...",
					success: "Transfer complete",
					error: "Transfer failed",
				},
			},
			onSuccess,
		}),
	);

	const handleSubmit = () => {
		if (!from || !to || !amount) return;
		mutate({
			fromWalletId: from,
			toWalletId: to,
			amount: Number.parseFloat(amount),
			description,
		});
	};

	return (
		<Card className="border-dashed">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">
						Transfer Funds Between Streams
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 w-7 p-0"
						onClick={onSuccess}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid sm:grid-cols-4 gap-4 items-end">
					<div className="grid gap-1.5">
						<Label>From</Label>
						<Select value={from} onValueChange={setFrom}>
							<SelectTrigger>
								<SelectValue placeholder="Source stream" />
							</SelectTrigger>
							<SelectContent>
								{streams.map((s) => (
									<SelectItem key={s.id} value={s.id}>
										{s.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-1.5">
						<Label>To</Label>
						<Select value={to} onValueChange={setTo}>
							<SelectTrigger>
								<SelectValue placeholder="Destination stream" />
							</SelectTrigger>
							<SelectContent>
								{streams
									.filter((s) => s.id !== from)
									.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.name}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
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
				</div>
				<div className="flex gap-2 mt-4">
					<SubmitButton
						isSubmitting={isPending}
						disabled={!from || !to || !amount}
						onClick={handleSubmit}
						type="button"
					>
						Transfer
					</SubmitButton>
					<Button variant="ghost" type="button" onClick={onSuccess}>
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

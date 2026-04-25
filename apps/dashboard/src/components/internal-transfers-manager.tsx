"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { useTRPC } from "@/trpc/client";
import { AnimatedNumber } from "./animated-number";

export function InternalTransfersManager() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
	const { data: transfers } = useSuspenseQuery(
		trpc.finance.getInternalTransfers.queryOptions({}),
	);

	const cancelTransfer = useMutation(
		trpc.finance.cancelInternalTransfer.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Cancelling transfer...",
					success: "Transfer cancelled",
					error: "Unable to cancel transfer",
				},
			},
			onSuccess: async () => {
				setSelectedTransferId(null);
				await Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.finance.getInternalTransfers.queryKey({}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStreams.queryKey({ filter: "session" }),
					}),
				]);
			},
		}),
	);

	const selectedTransfer =
		transfers.find((transfer) => transfer.id === selectedTransferId) ?? null;

	const totalVolume = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
	const cancellableCount = transfers.filter((transfer) => transfer.canCancel).length;
	const cancelledCount = transfers.filter(
		(transfer) => transfer.status === "cancelled",
	).length;

	return (
		<>
			<div className="space-y-6">
				<Card className="overflow-hidden rounded-3xl border-border shadow-sm">
					<CardHeader className="gap-5">
						<div className="space-y-2">
							<div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
								Internal Transfers
							</div>
							<CardTitle className="text-2xl tracking-tight">
								Manage transfers between account streams
							</CardTitle>
							<p className="max-w-2xl text-sm text-muted-foreground">
								Review stream-to-stream movements for the current term and
								cancel transfers that were posted in error.
							</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							<StatCard
								label="Transfers"
								value={String(transfers.length)}
								helper="Grouped transfer records"
							/>
							<StatCard
								label="Volume"
								value={<AnimatedNumber value={totalVolume} currency="NGN" />}
								helper="Total movement between streams"
							/>
							<StatCard
								label="Cancelable"
								value={String(cancellableCount)}
								helper={`${cancelledCount} already cancelled`}
							/>
						</div>
					</CardHeader>
				</Card>

				{transfers.length ? (
					<div className="grid gap-4">
						{transfers.map((transfer) => (
							<Card key={transfer.id} className="rounded-2xl border-border shadow-sm">
								<CardContent className="flex flex-col gap-4 p-5">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
										<div className="space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="text-base font-semibold">
													{transfer.fromWalletName || "Unknown source"} to{" "}
													{transfer.toWalletName || "Unknown destination"}
												</h3>
												<TransferStatusBadge status={transfer.status} />
												{transfer.reference && (
													<Badge variant="outline">{transfer.reference}</Badge>
												)}
											</div>
											<p className="text-sm text-muted-foreground">
												{transfer.description || "Fund transfer"}
											</p>
										</div>
										<div className="flex flex-col items-start gap-2 lg:items-end">
											<div className="text-lg font-semibold">
												<AnimatedNumber value={transfer.amount} currency="NGN" />
											</div>
											<div className="text-xs text-muted-foreground">
												{transfer.transactionDate
													? format(
															new Date(transfer.transactionDate),
															"MMM dd, yyyy • hh:mm a",
														)
													: "No date"}
											</div>
										</div>
									</div>

									<div className="grid gap-3 md:grid-cols-3">
										<TransferMetaCard
											label="From stream"
											value={transfer.fromWalletName || "Unknown"}
										/>
										<TransferMetaCard
											label="To stream"
											value={transfer.toWalletName || "Unknown"}
										/>
										<TransferMetaCard
											label="Pair integrity"
											value={`${transfer.transactionCount} transaction${transfer.transactionCount === 1 ? "" : "s"}`}
											helper={
												transfer.canCancel
													? "Safe to cancel"
													: "Needs review before cancellation"
											}
										/>
									</div>

									<div className="flex flex-wrap justify-end gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={!transfer.canCancel || cancelTransfer.isPending}
											onClick={() => setSelectedTransferId(transfer.id)}
										>
											Cancel Transfer
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<Card className="rounded-2xl border-border shadow-sm">
						<CardContent className="py-16 text-center text-sm text-muted-foreground">
							No internal transfers recorded for the current term yet.
						</CardContent>
					</Card>
				)}
			</div>

			<AlertDialog
				open={!!selectedTransfer}
				onOpenChange={(open) => {
					if (!open) setSelectedTransferId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel this internal transfer?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2 text-sm text-muted-foreground">
								<p>
									This will mark both sides of the transfer as cancelled so the
									stream balances no longer count it.
								</p>
								{selectedTransfer && (
									<div className="rounded-lg border bg-muted/30 p-3 text-foreground">
										<div className="font-medium">
											{selectedTransfer.fromWalletName || "Unknown source"} to{" "}
											{selectedTransfer.toWalletName || "Unknown destination"}
										</div>
										<div className="mt-1 text-sm">
											<AnimatedNumber
												value={selectedTransfer.amount}
												currency="NGN"
											/>
										</div>
									</div>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelTransfer.isPending}>
							Keep transfer
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={!selectedTransfer || cancelTransfer.isPending}
							onClick={(event) => {
								event.preventDefault();
								if (!selectedTransfer) return;
								cancelTransfer.mutate({ transferId: selectedTransfer.id });
							}}
						>
							{cancelTransfer.isPending ? "Cancelling..." : "Cancel transfer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function StatCard({
	label,
	value,
	helper,
}: {
	label: string;
	value: ReactNode;
	helper: string;
}) {
	return (
		<div className="rounded-2xl border bg-background p-4">
			<p className="text-sm font-medium text-muted-foreground">{label}</p>
			<div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
			<p className="mt-1 text-xs text-muted-foreground">{helper}</p>
		</div>
	);
}

function TransferMetaCard({
	label,
	value,
	helper,
}: {
	label: string;
	value: string;
	helper?: string;
}) {
	return (
		<div className="rounded-xl border bg-muted/20 p-3">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium">{value}</p>
			{helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
		</div>
	);
}

function TransferStatusBadge({
	status,
}: {
	status: string;
}) {
	if (status === "cancelled") {
		return <Badge variant="destructive">Cancelled</Badge>;
	}
	if (status === "success") {
		return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
	}
	return <Badge variant="outline">Pending</Badge>;
}

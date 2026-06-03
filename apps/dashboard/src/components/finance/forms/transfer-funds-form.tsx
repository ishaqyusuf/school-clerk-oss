"use client";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { FinanceStreamRow } from "@/components/tables/finance-streams/columns";
import { useTRPC } from "@/trpc/client";
import { useRefreshFinance } from "./use-refresh-finance";

type TransferFundsFormProps = {
	streams: FinanceStreamRow[];
};

export function TransferFundsForm({ streams }: TransferFundsFormProps) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const [fromStreamId, setFromStreamId] = useState("");
	const [toStreamId, setToStreamId] = useState("");
	const [transferAmount, setTransferAmount] = useState("");
	const [transferNote, setTransferNote] = useState("");
	const transferFunds = useMutation(
		trpc.finance.transferFunds.mutationOptions({
			onSuccess: async () => {
				setTransferAmount("");
				setTransferNote("");
				await refreshFinance();
			},
		}),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!fromStreamId || !toStreamId || !transferAmount) return;

		transferFunds.mutate({
			fromStreamId,
			toStreamId,
			amount: Number(transferAmount),
			note: transferNote,
		});
	};

	return (
		<form className="rounded-md border bg-background p-4" onSubmit={handleSubmit}>
			<h2 className="text-sm font-medium">Transfer Funds</h2>
			<div className="mt-3 space-y-3">
				<Select value={fromStreamId} onValueChange={setFromStreamId}>
					<SelectTrigger>
						<SelectValue placeholder="From stream" />
					</SelectTrigger>
					<SelectContent>
						{streams.map((stream) => (
							<SelectItem key={stream.id} value={stream.id}>
								{stream.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={toStreamId} onValueChange={setToStreamId}>
					<SelectTrigger>
						<SelectValue placeholder="To stream" />
					</SelectTrigger>
					<SelectContent>
						{streams.map((stream) => (
							<SelectItem key={stream.id} value={stream.id}>
								{stream.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input
					inputMode="decimal"
					placeholder="Amount"
					value={transferAmount}
					onChange={(event) => setTransferAmount(event.target.value)}
				/>
				<Input
					placeholder="Note"
					value={transferNote}
					onChange={(event) => setTransferNote(event.target.value)}
				/>
				<Button className="w-full" disabled={transferFunds.isPending} type="submit">
					Send Transfer
				</Button>
			</div>
		</form>
	);
}

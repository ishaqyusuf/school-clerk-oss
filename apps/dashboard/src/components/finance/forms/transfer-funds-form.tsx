"use client";

import { Button } from "@school-clerk/ui/button";
import { Card } from "@school-clerk/ui/composite";
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
import { ArrowRightLeft } from "lucide-react";

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
		<Card className="hover:shadow-md transition-shadow duration-300">
			<form onSubmit={handleSubmit}>
				<Card.Header className="pb-3">
					<Card.Title className="text-sm font-medium flex items-center gap-2">
						<div className="rounded-md bg-blue-500/10 p-1.5">
							<ArrowRightLeft className="h-4 w-4 text-blue-500" />
						</div>
						Transfer Funds
					</Card.Title>
				</Card.Header>
				<Card.Content className="space-y-3">
					<Select value={fromStreamId} onValueChange={setFromStreamId}>
						<SelectTrigger>
							<SelectValue placeholder="From account" />
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
							<SelectValue placeholder="To account" />
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
					<Button className="w-full" disabled={transferFunds.isPending} type="submit" variant="secondary">
						Send Transfer
					</Button>
				</Card.Content>
			</form>
		</Card>
	);
}

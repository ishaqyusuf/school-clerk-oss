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
import { useTRPC } from "@/trpc/client";
import { useRefreshFinance } from "./use-refresh-finance";
import { Plus } from "lucide-react";

type AccountType = "CREDIT" | "DEBIT";

export function CreateStreamForm() {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const [streamName, setStreamName] = useState("");
	const [accountType, setAccountType] = useState<AccountType>("CREDIT");
	const createStream = useMutation(
		trpc.finance.createStream.mutationOptions({
			onSuccess: async () => {
				setStreamName("");
				await refreshFinance();
			},
		}),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!streamName.trim()) return;

		createStream.mutate({
			name: streamName.trim(),
			accountType,
		});
	};

	return (
		<Card className="hover:shadow-md transition-shadow duration-300">
			<form onSubmit={handleSubmit}>
				<Card.Header className="pb-3">
					<Card.Title className="text-sm font-medium flex items-center gap-2">
						<div className="rounded-md bg-primary/10 p-1.5">
							<Plus className="h-4 w-4 text-primary" />
						</div>
						Create Account
					</Card.Title>
				</Card.Header>
				<Card.Content className="space-y-3">
					<Input
						id="finance-stream-name"
						placeholder="Account name (e.g. Tuition Fee)"
						value={streamName}
						onChange={(event) => setStreamName(event.target.value)}
					/>
					<Select
						value={accountType}
						onValueChange={(value) => setAccountType(value as AccountType)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Account type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="CREDIT">Credit (Income)</SelectItem>
							<SelectItem value="DEBIT">Debit (Expense)</SelectItem>
						</SelectContent>
					</Select>
					<Button className="w-full" disabled={createStream.isPending} type="submit">
						Save Account
					</Button>
				</Card.Content>
			</form>
		</Card>
	);
}

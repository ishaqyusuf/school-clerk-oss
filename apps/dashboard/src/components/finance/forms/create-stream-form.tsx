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
import { useTRPC } from "@/trpc/client";
import { useRefreshFinance } from "./use-refresh-finance";

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
		<form className="rounded-md border bg-background p-4" onSubmit={handleSubmit}>
			<h2 className="text-sm font-medium">Create Stream</h2>
			<div className="mt-3 space-y-3">
				<Input
					id="finance-stream-name"
					placeholder="Tuition Fee"
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
						<SelectItem value="CREDIT">Credit</SelectItem>
						<SelectItem value="DEBIT">Debit</SelectItem>
					</SelectContent>
				</Select>
				<Button className="w-full" disabled={createStream.isPending} type="submit">
					Save Stream
				</Button>
			</div>
		</form>
	);
}

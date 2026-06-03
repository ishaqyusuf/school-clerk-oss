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
type ItemType = "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";

function streamDefaultsForItem(type: ItemType): {
	streamName: string;
	accountType: AccountType;
} {
	switch (type) {
		case "TUITION_FEE":
			return { streamName: "Tuition Fee", accountType: "CREDIT" };
		case "BOOK":
			return { streamName: "Book", accountType: "CREDIT" };
		case "SALARY":
			return { streamName: "Salary", accountType: "DEBIT" };
		case "SERVICE":
			return { streamName: "Services", accountType: "DEBIT" };
		default:
			return { streamName: "Other", accountType: "CREDIT" };
	}
}

export function CreateItemForm() {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const [itemName, setItemName] = useState("");
	const [itemType, setItemType] = useState<ItemType>("TUITION_FEE");
	const [itemAmount, setItemAmount] = useState("");
	const createItem = useMutation(
		trpc.finance.createItem.mutationOptions({
			onSuccess: async () => {
				setItemName("");
				setItemAmount("");
				await refreshFinance();
			},
		}),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!itemName.trim() || !itemAmount) return;
		const defaults = streamDefaultsForItem(itemType);

		createItem.mutate({
			name: itemName.trim(),
			type: itemType,
			amount: Number(itemAmount),
			streamName: defaults.streamName,
			accountType: defaults.accountType,
		});
	};

	return (
		<form className="rounded-md border bg-background p-4" onSubmit={handleSubmit}>
			<h2 className="text-sm font-medium">Create Item</h2>
			<div className="mt-3 space-y-3">
				<Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
					<SelectTrigger>
						<SelectValue placeholder="Item type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="TUITION_FEE">Tuition fee</SelectItem>
						<SelectItem value="BOOK">Book</SelectItem>
						<SelectItem value="SERVICE">Service</SelectItem>
						<SelectItem value="SALARY">Salary</SelectItem>
						<SelectItem value="OTHER">Other</SelectItem>
					</SelectContent>
				</Select>
				<Input
					placeholder={itemType === "BOOK" ? "Nahw" : "Weekly Wage"}
					value={itemName}
					onChange={(event) => setItemName(event.target.value)}
				/>
				<Input
					inputMode="decimal"
					placeholder="Amount"
					value={itemAmount}
					onChange={(event) => setItemAmount(event.target.value)}
				/>
				<Button className="w-full" disabled={createItem.isPending} type="submit">
					Save Item
				</Button>
			</div>
		</form>
	);
}

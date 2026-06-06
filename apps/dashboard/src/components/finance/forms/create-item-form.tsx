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
import { PackagePlus } from "lucide-react";

type AccountType = "CREDIT" | "DEBIT";
type ItemType = "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";

const ITEM_TYPE_OPTIONS: Array<{ label: string; value: ItemType }> = [
	{ label: "Tuition fee", value: "TUITION_FEE" },
	{ label: "Book", value: "BOOK" },
	{ label: "Service", value: "SERVICE" },
	{ label: "Salary", value: "SALARY" },
	{ label: "Other", value: "OTHER" },
];

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

type CreateItemFormProps = {
	allowedItemTypes?: ItemType[];
	defaultItemType?: ItemType;
	namePlaceholder?: string;
	onCreated?: () => void;
	submitLabel?: string;
	title?: string;
};

export function CreateItemForm({
	allowedItemTypes,
	defaultItemType = "TUITION_FEE",
	namePlaceholder,
	onCreated,
	submitLabel = "Save Item",
	title = "Create Item",
}: CreateItemFormProps = {}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const itemTypeOptions = ITEM_TYPE_OPTIONS.filter((option) =>
		allowedItemTypes?.length ? allowedItemTypes.includes(option.value) : true,
	);
	const initialItemType =
		itemTypeOptions.find((option) => option.value === defaultItemType)?.value ??
		itemTypeOptions[0]?.value ??
		"TUITION_FEE";
	const [itemName, setItemName] = useState("");
	const [itemType, setItemType] = useState<ItemType>(initialItemType);
	const [itemAmount, setItemAmount] = useState("");
	const createItem = useMutation(
		trpc.finance.createItem.mutationOptions({
			onSuccess: async () => {
				setItemName("");
				setItemAmount("");
				await refreshFinance();
				onCreated?.();
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
		<Card className="hover:shadow-md transition-shadow duration-300">
			<form onSubmit={handleSubmit}>
				<Card.Header className="pb-3">
					<Card.Title className="text-sm font-medium flex items-center gap-2">
						<div className="rounded-md bg-secondary/30 p-1.5">
							<PackagePlus className="h-4 w-4 text-secondary-foreground" />
						</div>
						{title}
					</Card.Title>
				</Card.Header>
				<Card.Content className="space-y-3">
					{itemTypeOptions.length > 1 && (
						<Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
							<SelectTrigger>
								<SelectValue placeholder="Item type" />
							</SelectTrigger>
							<SelectContent>
								{itemTypeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Input
						placeholder={
							namePlaceholder ??
							(itemType === "BOOK" ? "e.g. Nahw textbook" : "Item Name")
						}
						value={itemName}
						onChange={(event) => setItemName(event.target.value)}
					/>
					<Input
						inputMode="decimal"
						placeholder="Amount"
						value={itemAmount}
						onChange={(event) => setItemAmount(event.target.value)}
					/>
					<Button className="w-full" disabled={createItem.isPending} type="submit" variant="secondary">
						{createItem.isPending ? "Saving..." : submitLabel}
					</Button>
				</Card.Content>
			</form>
		</Card>
	);
}

"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import { useRefreshFinance } from "@/components/finance/forms/use-refresh-finance";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useId, useState } from "react";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

const METHODS = ["Cash", "Bank Transfer", "POS / Card", "Cheque"];
const NEW_ACCOUNT = "__new_expense_account__";

type ExpenseKind = "SERVICE" | "PURCHASE";

/** Pay for a service or record a purchase; both post through `finance.recordPurchase`. */
export function RecordExpenseSheet() {
	const { recordExpense, setParams } = useFinanceSheetParams();
	const kind: ExpenseKind | null =
		recordExpense === "SERVICE" || recordExpense === "PURCHASE"
			? recordExpense
			: null;
	const close = () => setParams({ recordExpense: null });

	if (!kind) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
			sheetName="record-expense"
		>
			<SheetHeader>
				<SheetTitle>
					{kind === "SERVICE" ? "Pay for a service" : "Record a purchase"}
				</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				<RecordExpenseForm key={kind} kind={kind} onDone={close} />
			</CustomSheetContent>
		</CustomSheet>
	);
}

function Choice({
	pressed,
	onClick,
	children,
}: {
	pressed: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			className={cn(
				"flex flex-1 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left font-medium text-sm transition-colors",
				pressed
					? "border-primary bg-accent text-accent-foreground ring-1 ring-primary"
					: "hover:bg-accent/50",
			)}
		>
			{children}
		</button>
	);
}

function RecordExpenseForm({
	kind,
	onDone,
}: {
	kind: ExpenseKind;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const ids = useId();
	const isService = kind === "SERVICE";
	const [purpose, setPurpose] = useState<"SCHOOL_USE" | "RESALE">("SCHOOL_USE");
	const [title, setTitle] = useState("");
	const [payeeName, setPayeeName] = useState("");
	const [amount, setAmount] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitCost, setUnitCost] = useState("");
	const [paidNow, setPaidNow] = useState(true);
	const [pickedStreamId, setStreamId] = useState("");
	const [method, setMethod] = useState(METHODS[0]);

	const { data: accounts } = useQuery(
		trpc.finance.getAccounts.queryOptions({
			period: "all",
			pageSize: 100,
			accountTypes: [],
			health: [],
		}),
	);
	const { data: payees } = useQuery(trpc.finance.getPayees.queryOptions({}));

	// Spending posts as money out only on expense (DEBIT) accounts; income is
	// moved into them with a transfer. Without one, the API creates a default.
	const expenseAccounts = (accounts?.data ?? []).filter(
		(account) => account.id && account.name && account.accountType === "DEBIT",
	);
	const defaultAccountName = isService ? "Services" : "Purchases";
	const streamId =
		pickedStreamId || expenseAccounts[0]?.id || NEW_ACCOUNT;

	const total = isService
		? Number(amount) || 0
		: (Number(quantity) || 0) * (Number(unitCost) || 0);

	const record = useMutation(
		trpc.finance.recordPurchase.mutationOptions({
			onSuccess: async () => {
				await refreshFinance();
				toast({
					title: paidNow
						? isService
							? "Service paid"
							: "Purchase recorded"
						: "Saved to pay later",
					description: `${payeeName.trim() || title.trim()} · ${money.format(total)}`,
				});
				onDone();
			},
			onError: (error) => {
				toast({
					title: "Could not save",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim() || total <= 0) return;
		const isNewAccount = streamId === NEW_ACCOUNT;
		record.mutate({
			id: null,
			kind,
			purpose: isService ? "SCHOOL_USE" : purpose,
			streamId: isNewAccount ? null : streamId,
			streamName: isNewAccount ? defaultAccountName : null,
			payeeId: null,
			payeeName: payeeName.trim() || null,
			title: title.trim(),
			description: null,
			quantity: isService ? 1 : Number(quantity),
			unitCost: isService ? total : Number(unitCost),
			totalCost: total,
			amountPaid: paidNow ? total : 0,
			method: paidNow ? method : null,
			paymentDate: null,
			receiptNumber: null,
			reference: null,
			note: null,
			sessionId: null,
			termId: null,
		});
	};

	return (
		<form className="flex flex-col gap-4" onSubmit={onSubmit}>
			{isService ? null : (
				<div className="flex flex-col gap-2">
					<Label>Bought for</Label>
					<div className="flex gap-2">
						<Choice
							pressed={purpose === "SCHOOL_USE"}
							onClick={() => setPurpose("SCHOOL_USE")}
						>
							School use
							<span className="font-normal text-muted-foreground text-xs">
								Stationery, chalk, cleaning
							</span>
						</Choice>
						<Choice
							pressed={purpose === "RESALE"}
							onClick={() => setPurpose("RESALE")}
						>
							To sell to students
							<span className="font-normal text-muted-foreground text-xs">
								Uniforms, textbooks
							</span>
						</Choice>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${ids}-title`}>{isService ? "What for" : "Item"}</Label>
				<Input
					id={`${ids}-title`}
					autoFocus
					placeholder={isService ? "e.g. Generator diesel" : "e.g. Exercise books"}
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</div>

			{isService ? (
				<div className="flex flex-col gap-2">
					<Label htmlFor={`${ids}-amount`}>Amount</Label>
					<Input
						id={`${ids}-amount`}
						inputMode="decimal"
						placeholder="0"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
					/>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3">
					<div className="flex flex-col gap-2">
						<Label htmlFor={`${ids}-qty`}>Quantity</Label>
						<Input
							id={`${ids}-qty`}
							inputMode="decimal"
							value={quantity}
							onChange={(event) => setQuantity(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor={`${ids}-unit`}>Price each</Label>
						<Input
							id={`${ids}-unit`}
							inputMode="decimal"
							placeholder="0"
							value={unitCost}
							onChange={(event) => setUnitCost(event.target.value)}
						/>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${ids}-payee`}>{isService ? "Paid to" : "Supplier"}</Label>
				<Input
					id={`${ids}-payee`}
					list={`${ids}-payees`}
					placeholder="Supplier or person"
					value={payeeName}
					onChange={(event) => setPayeeName(event.target.value)}
				/>
				<datalist id={`${ids}-payees`}>
					{(payees ?? []).map((payee) => (
						<option key={payee.id} value={payee.name} />
					))}
				</datalist>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Payment</Label>
				<div className="flex gap-2">
					<Choice pressed={paidNow} onClick={() => setPaidNow(true)}>
						Paid now
					</Choice>
					<Choice pressed={!paidNow} onClick={() => setPaidNow(false)}>
						Pay later
					</Choice>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label>{paidNow ? "Paid from" : "Will be paid from"}</Label>
					<Select value={streamId} onValueChange={setStreamId}>
						<SelectTrigger>
							<SelectValue placeholder="Pick an expense account" />
						</SelectTrigger>
						<SelectContent>
							{expenseAccounts.map((account) => (
								<SelectItem key={account.id} value={account.id as string}>
									{account.name}
								</SelectItem>
							))}
							{expenseAccounts.length ? null : (
								<SelectItem value={NEW_ACCOUNT}>
									{defaultAccountName} (new expense account)
								</SelectItem>
							)}
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs">
						Only expense accounts pay out. Move money in from a fees account
						under Accounts → Money moved.
					</p>
				</div>
				{paidNow ? (
					<div className="flex flex-col gap-2">
						<Label>Paid by</Label>
						<Select value={method} onValueChange={setMethod}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{METHODS.map((item) => (
									<SelectItem key={item} value={item}>
										{item}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
			</div>

			<div className="flex items-center justify-between rounded-md bg-accent px-4 py-3 text-accent-foreground">
				<span className="text-sm">{isService ? "Amount" : "Total cost"}</span>
				<span className="font-semibold text-lg tabular-nums">{money.format(total)}</span>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={record.isPending || !title.trim() || total <= 0}
				>
					{paidNow ? (isService ? "Pay" : "Save purchase") : "Save to pay later"}
				</Button>
			</div>
		</form>
	);
}

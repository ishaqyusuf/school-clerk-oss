"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import { useRefreshFinance } from "@/components/finance/forms/use-refresh-finance";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
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
import { type FormEvent, useEffect, useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

const METHODS = ["Bank Transfer", "Cash", "Cheque"];

export function PaySalariesSheet() {
	const { paySalaries, setParams } = useFinanceSheetParams();
	const close = () => setParams({ paySalaries: null });

	if (!paySalaries) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
			sheetName="pay-salaries"
		>
			<SheetHeader>
				<SheetTitle>Pay salaries</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				<PaySalariesForm
					onDone={close}
					onCreateSalaries={() =>
						setParams({ paySalaries: null, createSalaries: true })
					}
				/>
			</CustomSheetContent>
		</CustomSheet>
	);
}

function PaySalariesForm({
	onDone,
	onCreateSalaries,
}: {
	onDone: () => void;
	onCreateSalaries: () => void;
}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const { data: charges, isLoading } = useQuery(
		trpc.finance.getCharges.queryOptions({ payerType: "STAFF", unpaidOnly: true }),
	);
	const due = useMemo(
		() => (charges ?? []).filter((charge) => charge.outstanding > 0),
		[charges],
	);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [method, setMethod] = useState(METHODS[0]);

	// Everyone due is ticked by default; the bursar unticks who to skip.
	useEffect(() => {
		setSelected(new Set(due.map((charge) => charge.id)));
	}, [due]);

	const total = due
		.filter((charge) => selected.has(charge.id))
		.reduce((sum, charge) => sum + charge.outstanding, 0);

	const pay = useMutation(
		trpc.finance.payStaffCharges.mutationOptions({
			onSuccess: async (result) => {
				await refreshFinance();
				toast({
					title: "Salaries paid",
					description: `${result.count} staff · ${money.format(result.total)}`,
				});
				onDone();
			},
			onError: (error) => {
				toast({
					title: "Could not pay salaries",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!selected.size) return;
		pay.mutate({ chargeIds: [...selected], method });
	};

	const staffName = (charge: (typeof due)[number]) =>
		charge.staffProfile?.name ??
		charge.staffTermProfile?.staffProfile?.name ??
		charge.payee?.name ??
		charge.title;

	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading salaries…</p>;
	}

	if (!due.length) {
		return (
			<div className="flex flex-col items-start gap-3 text-sm">
				<p>No staff salaries are waiting to be paid.</p>
				<p className="text-muted-foreground">
					Add this month's or this term's salaries first, from each staff
					member's pay setup.
				</p>
				<Button variant="outline" onClick={onCreateSalaries}>
					Create salaries
				</Button>
			</div>
		);
	}

	return (
		<form className="flex flex-col gap-4" onSubmit={onSubmit}>
			<p className="text-muted-foreground text-sm">
				Each salary is paid in full from its own salary account.
			</p>
			<div className="divide-y rounded-md border">
				{due.map((charge) => (
					<label
						key={charge.id}
						htmlFor={`salary-${charge.id}`}
						className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
					>
						<Checkbox
							id={`salary-${charge.id}`}
							checked={selected.has(charge.id)}
							onCheckedChange={(checked) =>
								setSelected((current) => {
									const next = new Set(current);
									if (checked) next.add(charge.id);
									else next.delete(charge.id);
									return next;
								})
							}
						/>
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium text-sm">
								{staffName(charge)}
							</span>
							<span className="block truncate text-muted-foreground text-xs">
								{charge.title} · {charge.stream?.name}
							</span>
						</span>
						<span className="text-sm tabular-nums">
							{money.format(charge.outstanding)}
						</span>
					</label>
				))}
			</div>

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

			<div className="flex items-center justify-between rounded-md bg-accent px-4 py-3 text-accent-foreground">
				<span className="text-sm">
					{selected.size} of {due.length} staff
				</span>
				<span className="font-semibold text-lg tabular-nums">{money.format(total)}</span>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" disabled={pay.isPending || !selected.size}>
					Pay selected staff
				</Button>
			</div>
		</form>
	);
}

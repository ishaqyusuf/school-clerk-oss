"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import {
	PAYROLL_CADENCES,
	type PayrollCadence,
	naira,
	payrollCadence,
	takeHomePay,
} from "@/components/finance/payroll/payroll-cadence";
import { useRefreshFinance } from "@/components/finance/forms/use-refresh-finance";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
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
import { type FormEvent, useId, useState } from "react";

const NEW_ACCOUNT = "__new_salary_account__";
const DEFAULT_ACCOUNT_NAME = "Salary/Wages";

/** Create or edit one staff member's pay: frequency, amounts and salary account. */
export function StaffPaySetupSheet() {
	const { staffPayStaffId, setParams } = useFinanceSheetParams();
	const close = () => setParams({ staffPayStaffId: null });
	const trpc = useTRPC();
	const { data: staff } = useQuery({
		...trpc.finance.getPayrollSetup.queryOptions(),
		enabled: !!staffPayStaffId,
	});
	const member = staff?.find((row) => row.id === staffPayStaffId);

	if (!staffPayStaffId) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
			sheetName="staff-pay-setup"
		>
			<SheetHeader>
				<SheetTitle>
					{member ? `${member.name}'s pay` : "Staff pay"}
				</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				{member ? (
					<StaffPayForm key={member.id} member={member} onDone={close} />
				) : (
					<p className="text-muted-foreground text-sm">Loading…</p>
				)}
			</CustomSheetContent>
		</CustomSheet>
	);
}

type SetupRow = RouterOutputs["finance"]["getPayrollSetup"][number];

function amountText(value: number | undefined) {
	return value ? String(value) : "";
}

function StaffPayForm({
	member,
	onDone,
}: {
	member: SetupRow;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const ids = useId();
	const current = member.structure;
	const [cadence, setCadence] = useState<PayrollCadence>(
		payrollCadence(current?.cadence).value,
	);
	const [title, setTitle] = useState(
		current?.title ?? (member.title ? `${member.title} pay` : "Salary"),
	);
	const [base, setBase] = useState(amountText(current?.baseAmount));
	const [allowance, setAllowance] = useState(amountText(current?.allowanceAmount));
	const [bonus, setBonus] = useState(amountText(current?.bonusAmount));
	const [deduction, setDeduction] = useState(amountText(current?.deductionAmount));
	const [advance, setAdvance] = useState(amountText(current?.advanceAmount));
	const [isActive, setIsActive] = useState(current?.isActive ?? true);
	const [notes, setNotes] = useState(current?.notes ?? "");
	const [pickedStreamId, setStreamId] = useState(current?.streamId ?? "");

	const { data: accounts } = useQuery(
		trpc.finance.getAccounts.queryOptions({
			period: "all",
			pageSize: 100,
			accountTypes: [],
			health: [],
		}),
	);
	// Salaries are money out, so they are paid from expense (DEBIT) accounts only.
	const expenseAccounts = (accounts?.data ?? []).filter(
		(account) => account.id && account.name && account.accountType === "DEBIT",
	);
	const streamId =
		pickedStreamId ||
		expenseAccounts.find((account) => account.name === DEFAULT_ACCOUNT_NAME)
			?.id ||
		expenseAccounts[0]?.id ||
		NEW_ACCOUNT;

	const values = {
		baseAmount: Number(base) || 0,
		allowanceAmount: Number(allowance) || 0,
		bonusAmount: Number(bonus) || 0,
		deductionAmount: Number(deduction) || 0,
		advanceAmount: Number(advance) || 0,
	};
	const takeHome = takeHomePay(values);
	const cadenceInfo = payrollCadence(cadence);

	const save = useMutation(
		trpc.finance.upsertPayrollStructure.mutationOptions({
			onSuccess: async () => {
				await refreshFinance();
				toast({
					title: "Pay saved",
					description: `${member.name} · ${cadenceInfo.label} · ${naira.format(takeHome)}`,
				});
				onDone();
			},
			onError: (error) => {
				toast({
					title: "Could not save pay",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim()) return;
		const isNewAccount = streamId === NEW_ACCOUNT;
		save.mutate({
			id: current?.id ?? null,
			staffProfileId: member.id,
			streamId: isNewAccount ? null : streamId,
			streamName: isNewAccount ? DEFAULT_ACCOUNT_NAME : null,
			title: title.trim(),
			cadence,
			...values,
			roleLabel: member.title,
			isActive,
			sessionId: null,
			termId: null,
			notes: notes.trim() || null,
		});
	};

	const amountField = (
		key: string,
		label: string,
		value: string,
		onChange: (value: string) => void,
	) => (
		<div className="flex flex-col gap-2">
			<Label htmlFor={`${ids}-${key}`}>{label}</Label>
			<Input
				id={`${ids}-${key}`}
				inputMode="decimal"
				placeholder="0"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);

	return (
		<form className="flex flex-col gap-4" onSubmit={onSubmit}>
			<div className="flex flex-col gap-2">
				<Label>How often</Label>
				<Select
					value={cadence}
					onValueChange={(value) => setCadence(value as PayrollCadence)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAYROLL_CADENCES.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-muted-foreground text-xs">{cadenceInfo.hint}</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${ids}-title`}>Name on the salary</Label>
				<Input
					id={`${ids}-title`}
					placeholder="e.g. Teacher pay"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</div>

			{amountField("base", cadenceInfo.rateLabel, base, setBase)}
			<div className="grid grid-cols-2 gap-3">
				{amountField("allowance", "Allowances", allowance, setAllowance)}
				{amountField("bonus", "Bonus", bonus, setBonus)}
				{amountField("deduction", "Deductions", deduction, setDeduction)}
				{amountField("advance", "Advances to recover", advance, setAdvance)}
			</div>

			<div className="flex flex-col gap-2">
				<Label>Paid from</Label>
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
								{DEFAULT_ACCOUNT_NAME} (new expense account)
							</SelectItem>
						)}
					</SelectContent>
				</Select>
				<p className="text-muted-foreground text-xs">
					Only expense accounts pay out. Move money in from a fees account
					under Accounts → Money moved.
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor={`${ids}-notes`}>Note</Label>
				<Input
					id={`${ids}-notes`}
					placeholder="Optional"
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
				/>
			</div>

			<label
				htmlFor={`${ids}-active`}
				className="flex cursor-pointer items-center gap-2 text-sm"
			>
				<Checkbox
					id={`${ids}-active`}
					checked={isActive}
					onCheckedChange={(checked) => setIsActive(checked === true)}
				/>
				Include in Create salaries
			</label>

			<div className="flex items-center justify-between rounded-md bg-accent px-4 py-3 text-accent-foreground">
				<span className="text-sm">Take-home {cadenceInfo.per}</span>
				<span className="font-semibold text-lg tabular-nums">
					{naira.format(takeHome)}
				</span>
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" disabled={save.isPending || !title.trim()}>
					Save pay
				</Button>
			</div>
		</form>
	);
}

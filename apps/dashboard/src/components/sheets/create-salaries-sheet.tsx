"use client";

import {
	CustomSheet,
	CustomSheetContent,
} from "@/components/custom-sheet-content";
import { useRefreshFinance } from "@/components/finance/forms/use-refresh-finance";
import { naira, payrollCadence } from "@/components/finance/payroll/payroll-cadence";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, type ReactNode, useId, useState } from "react";

type Period = { kind: "MONTH"; month: string } | { kind: "TERM"; termId: null };

function thisMonth() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Creates a month's or a term's salaries from each staff member's pay setup
 * (`finance.createSalaryRun`); they then show up in Pay salaries.
 */
export function CreateSalariesSheet() {
	const { createSalaries, setParams } = useFinanceSheetParams();
	const close = () => setParams({ createSalaries: null });

	if (!createSalaries) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
			sheetName="create-salaries"
		>
			<SheetHeader>
				<SheetTitle>Create salaries</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				<CreateSalariesForm
					onDone={close}
					onPayNow={() => setParams({ createSalaries: null, paySalaries: true })}
				/>
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

function CreateSalariesForm({
	onDone,
	onPayNow,
}: {
	onDone: () => void;
	onPayNow: () => void;
}) {
	const ids = useId();
	const [kind, setKind] = useState<Period["kind"]>("MONTH");
	const [month, setMonth] = useState(thisMonth);
	const [created, setCreated] = useState<{ count: number; total: number } | null>(
		null,
	);
	const period: Period =
		kind === "MONTH" ? { kind, month } : { kind, termId: null };

	if (created) {
		return (
			<div className="flex flex-col gap-4 text-sm">
				<p>
					Added {created.count} salar{created.count === 1 ? "y" : "ies"} ·{" "}
					<span className="font-medium tabular-nums">
						{naira.format(created.total)}
					</span>
					. They are now waiting in Pay salaries.
				</p>
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onDone}>
						Done
					</Button>
					<Button type="button" onClick={onPayNow}>
						Pay salaries now
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label>Salaries for</Label>
				<div className="flex gap-2">
					<Choice pressed={kind === "MONTH"} onClick={() => setKind("MONTH")}>
						A month
						<span className="font-normal text-muted-foreground text-xs">
							Monthly, daily and hourly staff
						</span>
					</Choice>
					<Choice pressed={kind === "TERM"} onClick={() => setKind("TERM")}>
						This term
						<span className="font-normal text-muted-foreground text-xs">
							Per-term, daily and hourly staff
						</span>
					</Choice>
				</div>
				{kind === "MONTH" ? (
					<Input
						id={`${ids}-month`}
						aria-label="Month"
						type="month"
						className="w-fit"
						value={month}
						onChange={(event) => event.target.value && setMonth(event.target.value)}
					/>
				) : null}
			</div>

			<SalaryRunPreview
				key={kind === "MONTH" ? month : "term"}
				period={period}
				onCreated={setCreated}
				onDone={onDone}
			/>
		</div>
	);
}

function SalaryRunPreview({
	period,
	onCreated,
	onDone,
}: {
	period: Period;
	onCreated: (result: { count: number; total: number }) => void;
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const { role } = useAuth();
	const isAdmin = role?.toLowerCase() === "admin";
	const { data, isLoading, error } = useQuery(
		trpc.finance.getSalaryRunPreview.queryOptions({ period }),
	);
	const [unticked, setUnticked] = useState<Set<string>>(new Set());
	const [units, setUnits] = useState<Record<string, string>>({});

	const create = useMutation(
		trpc.finance.createSalaryRun.mutationOptions({
			onSuccess: async (result) => {
				await refreshFinance();
				if (result.skipped.length) {
					toast({
						title: `${result.skipped.length} skipped`,
						description: result.skipped
							.map((row) => `${row.staffName}: ${row.reason}`)
							.join(" · "),
					});
				}
				onCreated({ count: result.count, total: result.total });
			},
			onError: (mutationError) => {
				toast({
					title: "Could not create salaries",
					description: mutationError.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (error) {
		return <p className="text-destructive text-sm">{error.message}</p>;
	}
	if (isLoading || !data) {
		return <p className="text-muted-foreground text-sm">Loading staff pay…</p>;
	}

	const open = data.rows.filter((row) => !row.chargedChargeId && !row.problem);
	const fixed = data.rows.filter((row) => !row.perUnit);
	const perUnit = data.rows.filter((row) => row.perUnit);
	const lines = open.flatMap((row) => {
		if (row.perUnit) {
			const count = Number(units[row.payrollStructureId]) || 0;
			return count > 0 ? [{ payrollStructureId: row.payrollStructureId, units: count, amount: row.rate * count }] : [];
		}
		return unticked.has(row.payrollStructureId)
			? []
			: [{ payrollStructureId: row.payrollStructureId, units: null, amount: row.rate }];
	});
	const total = lines.reduce((sum, line) => sum + line.amount, 0);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!lines.length) return;
		create.mutate({
			period,
			lines: lines.map(({ payrollStructureId, units: count }) => ({
				payrollStructureId,
				units: count,
			})),
		});
	};

	const nobodySetUp = !data.rows.length && !data.perTaskRows.length;
	if (nobodySetUp) {
		return (
			<div className="flex flex-col items-start gap-3 text-sm">
				<p>No staff pay is set up yet.</p>
				{isAdmin ? (
					<Button asChild variant="outline">
						<Link href="/finance/salaries/setup" onClick={onDone}>
							Open Staff pay setup
						</Link>
					</Button>
				) : (
					<p className="text-muted-foreground">
						Ask an Admin to set each staff member's pay under Salaries → Staff pay
						setup.
					</p>
				)}
			</div>
		);
	}

	const status = (row: (typeof data.rows)[number]) =>
		row.chargedChargeId ? "Already added" : row.problem;

	return (
		<div className="flex flex-col gap-4">
		<form className="flex flex-col gap-4" onSubmit={onSubmit}>
			{fixed.length ? (
				<section className="flex flex-col gap-2">
					<h3 className="font-medium text-sm">
						Paid by the {period.kind === "MONTH" ? "month" : "term"}
					</h3>
					<div className="divide-y rounded-md border">
						{fixed.map((row) => {
							const blocked = status(row);
							const id = `salary-run-${row.payrollStructureId}`;
							return (
								<label
									key={row.payrollStructureId}
									htmlFor={id}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5",
										blocked ? "opacity-60" : "cursor-pointer",
									)}
								>
									<Checkbox
										id={id}
										disabled={!!blocked}
										checked={!blocked && !unticked.has(row.payrollStructureId)}
										onCheckedChange={(checked) =>
											setUnticked((current) => {
												const next = new Set(current);
												if (checked) next.delete(row.payrollStructureId);
												else next.add(row.payrollStructureId);
												return next;
											})
										}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{row.staff.name}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											{blocked ?? `${row.title} · ${row.stream.name}`}
										</span>
									</span>
									<span className="text-sm tabular-nums">
										{naira.format(row.rate)}
									</span>
								</label>
							);
						})}
					</div>
				</section>
			) : null}

			{perUnit.length ? (
				<section className="flex flex-col gap-2">
					<h3 className="font-medium text-sm">Paid by the day or hour</h3>
					<div className="divide-y rounded-md border">
						{perUnit.map((row) => {
							const blocked = status(row);
							const noun = row.cadence === "HOURLY" ? "Hours" : "Days";
							const count = Number(units[row.payrollStructureId]) || 0;
							return (
								<div
									key={row.payrollStructureId}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5",
										blocked && "opacity-60",
									)}
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{row.staff.name}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											{blocked ??
												`${naira.format(row.rate)} ${payrollCadence(row.cadence).per}`}
										</span>
									</span>
									<Input
										aria-label={`${noun} worked by ${row.staff.name}`}
										inputMode="decimal"
										placeholder={noun}
										className="w-20"
										disabled={!!blocked}
										value={units[row.payrollStructureId] ?? ""}
										onChange={(event) =>
											setUnits((current) => ({
												...current,
												[row.payrollStructureId]: event.target.value,
											}))
										}
									/>
									<span className="w-28 text-right text-sm tabular-nums">
										{count > 0 ? naira.format(row.rate * count) : "—"}
									</span>
								</div>
							);
						})}
					</div>
				</section>
			) : null}

			{data.rows.length ? (
				<>
					<div className="flex items-center justify-between rounded-md bg-accent px-4 py-3 text-accent-foreground">
						<span className="text-sm">
							{lines.length} staff · {data.period.label}
							{data.summary.alreadyChargedCount
								? ` · ${data.summary.alreadyChargedCount} already added`
								: ""}
						</span>
						<span className="font-semibold text-lg tabular-nums">
							{naira.format(total)}
						</span>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onDone}>
							Cancel
						</Button>
						<Button type="submit" disabled={create.isPending || !lines.length}>
							Create {lines.length || ""} salar{lines.length === 1 ? "y" : "ies"}
						</Button>
					</div>
				</>
			) : (
				<p className="text-muted-foreground text-sm">
					Nobody is paid by the {period.kind === "MONTH" ? "month" : "term"}.
				</p>
			)}
		</form>

			{data.perTaskRows.length ? (
				<section className="flex flex-col gap-2 border-t pt-4">
					<h3 className="font-medium text-sm">Paid per task or one-off</h3>
					<p className="text-muted-foreground text-xs">
						Add pay one job at a time. It goes straight to Pay salaries.
					</p>
					<div className="divide-y rounded-md border">
						{data.perTaskRows.map((row) => (
							<TaskPayRow key={row.payrollStructureId} row={row} />
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}

function TaskPayRow({
	row,
}: {
	row: {
		payrollStructureId: string;
		staff: { name: string };
		title: string;
		rate: number;
		problem: string | null;
		stream: { accountType: string };
	};
}) {
	const trpc = useTRPC();
	const refreshFinance = useRefreshFinance();
	const ids = useId();
	const [adding, setAdding] = useState(false);
	const [amount, setAmount] = useState(row.rate ? String(row.rate) : "");
	const [note, setNote] = useState("");

	const add = useMutation(
		trpc.finance.createPayrollObligation.mutationOptions({
			onSuccess: async (charge) => {
				await refreshFinance();
				toast({
					title: "Pay added",
					description: `${row.staff.name} · ${naira.format(charge.amount)}`,
				});
				setAdding(false);
				setNote("");
			},
			onError: (error) => {
				toast({
					title: "Could not add pay",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const value = Number(amount) || 0;

	return (
		<div className="flex flex-col gap-2 px-3 py-2.5">
			<div className="flex items-center gap-3">
				<span className="min-w-0 flex-1">
					<span className="block truncate font-medium text-sm">{row.staff.name}</span>
					<span className="block truncate text-muted-foreground text-xs">
						{row.problem ?? row.title}
					</span>
				</span>
				{adding ? null : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={row.stream.accountType !== "DEBIT"}
						onClick={() => setAdding(true)}
					>
						Add pay
					</Button>
				)}
			</div>
			{adding ? (
				<div className="flex flex-wrap items-end gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor={`${ids}-amount`} className="text-xs">
							Amount
						</Label>
						<Input
							id={`${ids}-amount`}
							inputMode="decimal"
							className="w-32"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
						/>
					</div>
					<div className="flex min-w-40 flex-1 flex-col gap-1">
						<Label htmlFor={`${ids}-note`} className="text-xs">
							What for
						</Label>
						<Input
							id={`${ids}-note`}
							placeholder="e.g. Fixed the generator"
							value={note}
							onChange={(event) => setNote(event.target.value)}
						/>
					</div>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => setAdding(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={add.isPending || value <= 0}
						onClick={() =>
							add.mutate({
								payrollStructureId: row.payrollStructureId,
								title: null,
								description: note.trim() || null,
								amount: value,
								dueDate: null,
								sessionId: null,
								termId: null,
							})
						}
					>
						Add
					</Button>
				</div>
			) : null}
		</div>
	);
}

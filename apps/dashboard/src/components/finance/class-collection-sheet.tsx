"use client";

import {
	PAYMENT_METHODS,
	formatNaira,
	invalidateStudentPaymentQueries,
	parseAmount,
	round2,
} from "@/components/finance/student-payment-allocation";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, CircleAlert, CreditCard } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type RowResult = { ok: boolean; error: string | null };

/**
 * Class collection sheet (finance/batch-payment-receive, direction 01): pick a
 * class and a fee, type amounts down the roster like a spreadsheet, post them
 * together. Amounts are kept per charge, so switching fee keeps what was typed.
 */
export function ClassCollectionSheet() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const [classroomId, setClassroomId] = useState<string | null>(null);
	const [feeKey, setFeeKey] = useState<string | null>(null);
	const [method, setMethod] = useState<string>("Cash");
	const [paymentDate, setPaymentDate] = useState(() =>
		format(new Date(), "yyyy-MM-dd"),
	);
	const [amounts, setAmounts] = useState<Record<string, string>>({});
	const [rowMethods, setRowMethods] = useState<Record<string, string>>({});
	const [results, setResults] = useState<Record<string, RowResult>>({});
	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	const { data, isLoading } = useQuery(
		trpc.finance.getClassCollectionRoster.queryOptions({
			classroomDepartmentId: classroomId,
		}),
	);
	const activeClassroomId = classroomId ?? data?.classroomDepartmentId ?? null;
	const fees = data?.fees ?? [];
	const activeFeeKey =
		feeKey && fees.some((fee) => fee.key === feeKey) ? feeKey : (fees[0]?.key ?? null);
	const activeFee = fees.find((fee) => fee.key === activeFeeKey);

	const rows = useMemo(
		() =>
			(data?.students ?? []).flatMap((student) => {
				const charge = student.charges.find((c) => c.feeKey === activeFeeKey);
				return charge ? [{ ...charge, studentId: student.studentId, name: student.name }] : [];
			}),
		[data?.students, activeFeeKey],
	);

	// Everything typed on this class, across fees, so a fee switch never loses work.
	const allCharges = useMemo(() => {
		const map = new Map<string, { studentId: string; outstanding: number }>();
		for (const student of data?.students ?? []) {
			for (const charge of student.charges) {
				map.set(charge.chargeId, {
					studentId: student.studentId,
					outstanding: charge.outstanding,
				});
			}
		}
		return map;
	}, [data?.students]);

	const pending = Object.entries(amounts)
		.map(([chargeId, text]) => ({
			chargeId,
			amount: parseAmount(text),
			charge: allCharges.get(chargeId),
		}))
		.filter((row) => row.amount > 0 && row.charge);
	const invalid = pending.filter(
		(row) => row.amount > (row.charge?.outstanding ?? 0) + 0.009,
	);
	const postable = pending.filter((row) => !invalid.includes(row));
	const total = round2(postable.reduce((sum, row) => sum + row.amount, 0));

	const mutation = useMutation(
		trpc.finance.receiveStudentPaymentBatch.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Posting payments...",
					success: "Class payments posted",
					error: "Could not post payments",
				},
			},
		}),
	);

	const post = async () => {
		if (!postable.length) return;
		const response = await mutation.mutateAsync({
			rows: postable.map((row) => ({
				studentId: row.charge!.studentId,
				chargeId: row.chargeId,
				amount: row.amount,
				method: rowMethods[row.chargeId] ?? method,
			})),
			method,
			paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00`) : null,
		});
		const next: Record<string, RowResult> = {};
		for (const result of response.results) {
			next[result.chargeId] = { ok: result.ok, error: result.error };
		}
		setResults(next);
		setAmounts((current) =>
			Object.fromEntries(
				Object.entries(current).filter(([chargeId]) => !next[chargeId]?.ok),
			),
		);
		await invalidateStudentPaymentQueries(qc, trpc);
	};

	const focusRow = (index: number) => {
		const target = rows[Math.max(0, Math.min(rows.length - 1, index))];
		const input = target ? inputRefs.current[target.chargeId] : null;
		input?.focus();
		input?.select();
	};

	const onAmountKey = (
		event: React.KeyboardEvent<HTMLInputElement>,
		index: number,
		row: (typeof rows)[number],
	) => {
		if (event.key === "Enter" || event.key === "ArrowDown") {
			event.preventDefault();
			focusRow(index + 1);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			focusRow(index - 1);
		} else if (event.key === "f" || event.key === "F") {
			event.preventDefault();
			setAmounts((current) => ({ ...current, [row.chargeId]: String(row.outstanding) }));
		} else if (event.key === "Escape") {
			setAmounts((current) => {
				const next = { ...current };
				delete next[row.chargeId];
				return next;
			});
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="space-y-1.5">
					<Label>Class</Label>
					<Select
						value={activeClassroomId ?? undefined}
						onValueChange={(value) => {
							setClassroomId(value);
							setFeeKey(null);
							setResults({});
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder={isLoading ? "Loading classes…" : "Select a class"} />
						</SelectTrigger>
						<SelectContent>
							{(data?.classrooms ?? []).map((classroom) => (
								<SelectItem key={classroom.id} value={classroom.id}>
									{classroom.label} · {classroom.studentCount}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label>Fee</Label>
					<Select
						value={activeFeeKey ?? undefined}
						onValueChange={(value) => {
							setFeeKey(value);
							setResults({});
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder={fees.length ? "Select a fee" : "No fees for this class"} />
						</SelectTrigger>
						<SelectContent>
							{fees.map((fee) => (
								<SelectItem key={fee.key} value={fee.key}>
									{fee.title} · {fee.streamName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label>Default method</Label>
					<Select value={method} onValueChange={setMethod}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PAYMENT_METHODS.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="class-collection-date">Payment date</Label>
					<Input
						id="class-collection-date"
						type="date"
						value={paymentDate}
						onChange={(event) => setPaymentDate(event.target.value)}
					/>
				</div>
			</div>

			<div className="overflow-hidden rounded-md border bg-card">
				<div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
					<div className="min-w-0 flex-1">
						<p className="font-semibold text-sm">{activeFee?.title ?? "Roster"}</p>
						<p className="text-muted-foreground text-xs">
							{activeFee
								? `${activeFee.studentCount} students · ${formatNaira(activeFee.outstanding)} outstanding`
								: "Choose a class and fee to start."}
						</p>
					</div>
					<p className="hidden text-muted-foreground text-xs sm:block">
						<kbd className="rounded border px-1 font-mono">Enter</kbd> next ·{" "}
						<kbd className="rounded border px-1 font-mono">F</kbd> full ·{" "}
						<kbd className="rounded border px-1 font-mono">Esc</kbd> clear
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[640px] text-sm">
						<thead>
							<tr className="border-b font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.06em]">
								<th className="h-9 px-4 text-left font-semibold">Student</th>
								<th className="h-9 px-3 text-right font-semibold">Due</th>
								<th className="h-9 w-40 px-3 text-right font-semibold">Amount received</th>
								<th className="h-9 w-40 px-3 text-left font-semibold">Method</th>
								<th className="h-9 w-36 px-4 text-left font-semibold">Status</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
										Loading roster…
									</td>
								</tr>
							) : !rows.length ? (
								<tr>
									<td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
										No students owe this fee yet.
									</td>
								</tr>
							) : (
								rows.map((row, index) => {
									const cleared = row.outstanding <= 0;
									const amount = parseAmount(amounts[row.chargeId]);
									const over = amount > row.outstanding + 0.009;
									const result = results[row.chargeId];
									return (
										<tr
											key={row.chargeId}
											className={cn("border-b last:border-b-0", cleared && "opacity-55")}
										>
											<td className="px-4 py-2 font-medium">{row.name}</td>
											<td className="px-3 py-2 text-right font-mono tabular-nums">
												{cleared ? <Badge variant="success">Paid</Badge> : formatNaira(row.outstanding)}
											</td>
											<td className="px-3 py-1.5">
												{cleared ? null : (
													<div className="flex items-center gap-1">
														<Input
															ref={(el) => {
																inputRefs.current[row.chargeId] = el;
															}}
															inputMode="decimal"
															aria-label={`Amount from ${row.name}`}
															className={cn(
																"h-8 text-right font-mono tabular-nums",
																over && "border-destructive",
															)}
															placeholder="0"
															value={amounts[row.chargeId] ?? ""}
															onChange={(event) =>
																setAmounts((current) => ({
																	...current,
																	[row.chargeId]: event.target.value,
																}))
															}
															onKeyDown={(event) => onAmountKey(event, index, row)}
														/>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="h-8 px-2 text-xs"
															onClick={() =>
																setAmounts((current) => ({
																	...current,
																	[row.chargeId]: String(row.outstanding),
																}))
															}
														>
															Full
														</Button>
													</div>
												)}
											</td>
											<td className="px-3 py-1.5">
												{cleared ? null : (
													<Select
														value={rowMethods[row.chargeId] ?? method}
														onValueChange={(value) =>
															setRowMethods((current) => ({
																...current,
																[row.chargeId]: value,
															}))
														}
													>
														<SelectTrigger className="h-8 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{PAYMENT_METHODS.map((option) => (
																<SelectItem key={option} value={option}>
																	{option}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											</td>
											<td className="px-4 py-2 text-xs">
												{result?.ok ? (
													<span className="inline-flex items-center gap-1 text-status-success-fg">
														<CheckCircle2 className="h-3.5 w-3.5" />
														Posted
													</span>
												) : result && !result.ok ? (
													<span className="inline-flex items-center gap-1 text-destructive" title={result.error ?? undefined}>
														<CircleAlert className="h-3.5 w-3.5" />
														{result.error ?? "Failed"}
													</span>
												) : over ? (
													<span className="text-destructive">
														Over by {formatNaira(amount - row.outstanding)}
													</span>
												) : amount > 0 ? (
													<span className="text-muted-foreground">
														{amount >= row.outstanding - 0.009 ? "Will clear" : "Part payment"}
													</span>
												) : null}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-md border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] backdrop-blur">
				<div className="min-w-0 flex-1">
					<p className="font-mono font-semibold tabular-nums">
						{postable.length} payment{postable.length === 1 ? "" : "s"} · {formatNaira(total)}
					</p>
					<p className="text-muted-foreground text-xs">
						{invalid.length
							? `${invalid.length} row${invalid.length === 1 ? " is" : "s are"} more than owed and will be skipped.`
							: "Each row posts as its own receipt."}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					disabled={!pending.length || mutation.isPending}
					onClick={() => {
						setAmounts({});
						setResults({});
					}}
				>
					Clear
				</Button>
				<Button
					type="button"
					className="gap-2"
					disabled={!postable.length || mutation.isPending}
					onClick={() => void post()}
				>
					<CreditCard className="h-4 w-4" />
					Post {postable.length || ""} payment{postable.length === 1 ? "" : "s"}
				</Button>
			</div>
		</div>
	);
}

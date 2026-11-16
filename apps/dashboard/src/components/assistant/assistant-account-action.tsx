"use client";

import { useRefreshFinance } from "@/components/finance/forms/use-refresh-finance";
import { useStudentParams } from "@/hooks/use-student-params";
import { useAssistantStudentForm } from "@/store/assistant-student-form";
import { useTRPC } from "@/trpc/client";
import {
	type AssistantAccountAction,
	accountActionSubmission,
	assistantMoney,
} from "@school-clerk/ai/contracts";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cloneElement, type ReactElement, useId, useState } from "react";
import type { z } from "zod";

type Action<Name extends AssistantAccountAction["action"]> = Extract<
	AssistantAccountAction,
	{ action: Name }
>;
type Submission = z.input<typeof accountActionSubmission>;
type Save = (selection: Submission) => void;
type Person = { id: string; name: string; detail?: string | null };
const formatter = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
});
const selector =
	"h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-50";

function Field({
	label,
	children,
}: { label: string; children: ReactElement<{ id?: string }> }) {
	const id = useId();
	return (
		<div className="grid min-w-0 gap-1 text-sm">
			<label htmlFor={id}>{label}</label>
			{cloneElement(children, { id })}
		</div>
	);
}

function PersonPicker({
	label,
	matches,
	value,
	onChange,
}: {
	label: string;
	matches: Person[];
	value: string;
	onChange: (id: string) => void;
}) {
	return (
		<Field label={label}>
			<select
				className={selector}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				required
			>
				<option value="">
					{matches.length ? "Choose a matching person" : "No matching record"}
				</option>
				{matches.map((person) => (
					<option key={person.id} value={person.id}>
						{person.name}
						{person.detail ? ` · ${person.detail}` : ""}
					</option>
				))}
			</select>
		</Field>
	);
}

function AmountField({
	value,
	onChange,
}: { value: string; onChange: (value: string) => void }) {
	return (
		<Field label="Amount (₦)">
			<Input
				inputMode="decimal"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				required
			/>
		</Field>
	);
}

function PaymentFields({
	method,
	date,
	reference,
	onChange,
}: {
	method: "Cash" | "Bank Transfer" | "Cheque";
	date: string;
	reference: string;
	onChange: (value: {
		method: "Cash" | "Bank Transfer" | "Cheque";
		date: string;
		reference: string;
	}) => void;
}) {
	return (
		<div className="grid gap-2 sm:grid-cols-3">
			<Field label="Payment method">
				<select
					className={selector}
					value={method}
					onChange={(event) => {
						const selected = event.target.value;
						if (
							selected === "Cash" ||
							selected === "Bank Transfer" ||
							selected === "Cheque"
						)
							onChange({ method: selected, date, reference });
					}}
				>
					<option>Cash</option>
					<option>Bank Transfer</option>
					<option>Cheque</option>
				</select>
			</Field>
			<Field label="Payment date">
				<Input
					type="date"
					value={date}
					onChange={(event) =>
						onChange({ method, date: event.target.value, reference })
					}
				/>
			</Field>
			<Field label="Bank reference">
				<Input
					maxLength={120}
					value={reference}
					onChange={(event) =>
						onChange({ method, date, reference: event.target.value })
					}
				/>
			</Field>
		</div>
	);
}

const initialId = (matches: Person[]) =>
	matches.length === 1 ? (matches[0]?.id ?? "") : "";
type PaymentLine = { studentId: string; chargeId: string; amount: string };

function StudentPaymentLine({
	line,
	student,
	matches,
	setLine,
}: {
	line: PaymentLine;
	student: Action<"student_payment">["students"][number];
	matches: Person[];
	setLine: (line: PaymentLine) => void;
}) {
	const trpc = useTRPC();
	const studentParams = useStudentParams();
	const setSeed = useAssistantStudentForm((state) => state.setSeed);
	const charges = useQuery(
		trpc.finance.getStudentOpenCharges.queryOptions(
			{ studentId: line.studentId },
			{ enabled: Boolean(line.studentId), staleTime: 15_000 },
		),
	);
	const feeChoices = charges.data?.charges ?? [];
	return (
		<div className="grid gap-2 rounded-md border p-3">
			<PersonPicker
				label={student.name}
				matches={matches}
				value={line.studentId}
				onChange={(studentId) => setLine({ ...line, studentId, chargeId: "" })}
			/>
			{!matches.length && (
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="justify-self-start"
					onClick={() => {
						const amount = assistantMoney.safeParse(line.amount);
						setSeed({
							kind: "register",
							input: {
								action: "register_student",
								name: student.name,
								admissionType: "NEW_ADMISSION",
								fees:
									student.fee && amount.success
										? [{ name: student.fee, amount: amount.data }]
										: [],
							},
						});
						void studentParams.setParams({
							createStudent: true,
							createStudentPrefillName: null,
							createStudentReturnTo: "assistant",
						});
					}}
				>
					Register student
				</Button>
			)}
			{line.studentId && (
				<Field label={student.fee ? `Fee · ${student.fee}` : "Fee to pay"}>
					<select
						className={selector}
						value={line.chargeId}
						required
						onChange={(event) =>
							setLine({ ...line, chargeId: event.target.value })
						}
					>
						<option value="">
							{charges.isPending
								? "Loading fees…"
								: feeChoices.length
									? "Choose a fee"
									: "No open fee found"}
						</option>
						{feeChoices.map((charge) => (
							<option key={charge.id} value={charge.id}>
								{charge.title} · {charge.termLabel} ·{" "}
								{formatter.format(charge.outstanding)}
							</option>
						))}
					</select>
				</Field>
			)}
			<AmountField
				value={line.amount}
				onChange={(amount) => setLine({ ...line, amount })}
			/>
		</div>
	);
}

function StudentPaymentForm({
	card,
	pending,
	save,
}: { card: Action<"student_payment">; pending: boolean; save: Save }) {
	const [lines, setLines] = useState<PaymentLine[]>(() =>
		card.students.map((student, index) => ({
			studentId: initialId(card.matches[index] ?? []),
			chargeId: "",
			amount: String(student.amount),
		})),
	);
	const [details, setDetails] = useState({
		method: card.method ?? ("Cash" as const),
		date: card.date ?? "",
		reference: card.reference ?? "",
	});
	const allocated = lines.reduce((sum, line) => {
		const amount = assistantMoney.safeParse(line.amount);
		return sum + (amount.success ? Math.round(amount.data * 100) : 0);
	}, 0);
	return (
		<form
			className="grid gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				save({
					action: "student_payment",
					lines,
					method: details.method,
					date: details.date || undefined,
					reference: details.reference.trim() || undefined,
				});
			}}
		>
			{card.students.map((student, index) => (
				// The draft rows have stable position for the lifetime of the loaded draft.
				<StudentPaymentLine
					key={`${index}:${student.name}`}
					student={student}
					matches={card.matches[index] ?? []}
					line={
						lines[index] ?? {
							studentId: "",
							chargeId: "",
							amount: String(student.amount),
						}
					}
					setLine={(line) =>
						setLines((current) =>
							current.map((row, rowIndex) => (rowIndex === index ? line : row)),
						)
					}
				/>
			))}
			<PaymentFields {...details} onChange={setDetails} />
			<p className="text-sm">
				Allocated {formatter.format(allocated / 100)}
				{card.transferTotal !== undefined &&
					` of ${formatter.format(card.transferTotal)}`}
			</p>
			<Button
				type="submit"
				className="justify-self-start"
				disabled={
					pending ||
					!lines.every((line) => line.studentId && line.chargeId) ||
					(card.transferTotal !== undefined &&
						allocated !== Math.round(card.transferTotal * 100))
				}
			>
				Record payment
			</Button>
		</form>
	);
}

function AccountsField({
	label,
	accounts,
	value,
	onChange,
}: {
	label: string;
	accounts: { id: string; name: string }[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Field label={label}>
			<select
				className={selector}
				required
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				<option value="">Choose an account</option>
				{accounts.map((account) => (
					<option key={account.id} value={account.id}>
						{account.name}
					</option>
				))}
			</select>
		</Field>
	);
}

function SalaryForm({
	card,
	pending,
	save,
}: { card: Action<"staff_payment">; pending: boolean; save: Save }) {
	const trpc = useTRPC();
	const [staffId, setStaffId] = useState(() => initialId(card.matches));
	const [chargeId, setChargeId] = useState("");
	const [streamId, setStreamId] = useState("");
	const [amount, setAmount] = useState(String(card.amount));
	const [details, setDetails] = useState({
		method: card.method ?? ("Cash" as const),
		date: card.date ?? "",
		reference: card.reference ?? "",
	});
	const charges = useQuery(
		trpc.assistant.salaryOptions.queryOptions(
			{ staffId },
			{ enabled: Boolean(staffId) },
		),
	);
	const accounts = useQuery(
		trpc.assistant.accountOptions.queryOptions(
			{ action: "staff_payment" },
			{ enabled: chargeId === "new" },
		),
	);
	return (
		<form
			className="grid gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				save({
					action: "staff_payment",
					staffId,
					chargeId: chargeId === "new" ? undefined : chargeId,
					streamId: chargeId === "new" ? streamId : undefined,
					amount,
					method: details.method,
					date: details.date || undefined,
					reference: details.reference.trim() || undefined,
				});
			}}
		>
			<PersonPicker
				label="Staff member"
				matches={card.matches}
				value={staffId}
				onChange={(id) => {
					setStaffId(id);
					setChargeId("");
				}}
			/>
			{staffId && (
				<Field label="Salary to pay">
					<select
						className={selector}
						value={chargeId}
						onChange={(event) => setChargeId(event.target.value)}
						required
					>
						<option value="">
							{charges.isPending ? "Loading salaries…" : "Choose a salary"}
						</option>
						{(charges.data ?? []).map((charge) => (
							<option key={charge.id} value={charge.id}>
								{charge.title} · {charge.account} ·{" "}
								{formatter.format(charge.outstanding)}
							</option>
						))}
						<option value="new">Record a one-off salary</option>
					</select>
				</Field>
			)}
			{chargeId === "new" && (
				<AccountsField
					label="Expense account"
					accounts={accounts.data ?? []}
					value={streamId}
					onChange={setStreamId}
				/>
			)}
			<AmountField value={amount} onChange={setAmount} />
			<PaymentFields {...details} onChange={setDetails} />
			<Button
				type="submit"
				className="justify-self-start"
				disabled={
					pending || !staffId || !chargeId || (chargeId === "new" && !streamId)
				}
			>
				Record salary
			</Button>
		</form>
	);
}

function TransferForm({
	card,
	pending,
	save,
}: { card: Action<"transfer">; pending: boolean; save: Save }) {
	const trpc = useTRPC();
	const accounts = useQuery(
		trpc.assistant.accountOptions.queryOptions({ action: "transfer" }),
	);
	const [fromId, setFromId] = useState(card.fromId ?? "");
	const [toId, setToId] = useState(card.toId ?? "");
	const [amount, setAmount] = useState(String(card.amount));
	const [note, setNote] = useState(card.note ?? "");
	return (
		<form
			className="grid gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				save({ action: "transfer", fromId, toId, amount, note });
			}}
		>
			<AccountsField
				label="From account"
				accounts={accounts.data ?? []}
				value={fromId}
				onChange={setFromId}
			/>
			<AccountsField
				label="To account"
				accounts={(accounts.data ?? []).filter(
					(account) => account.id !== fromId,
				)}
				value={toId === fromId ? "" : toId}
				onChange={setToId}
			/>
			<AmountField value={amount} onChange={setAmount} />
			<Field label="Reason">
				<Input
					value={note}
					onChange={(event) => setNote(event.target.value)}
					maxLength={200}
					required
				/>
			</Field>
			<Button
				type="submit"
				className="justify-self-start"
				disabled={pending || !fromId || !toId || fromId === toId}
			>
				Record transfer
			</Button>
		</form>
	);
}

export function AssistantAccountActionForm({
	card,
	draftId,
	status,
	expiresAt,
	busy,
}: {
	card: AssistantAccountAction;
	draftId?: string;
	status?: string;
	expiresAt?: string;
	busy: boolean;
}) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const refreshFinance = useRefreshFinance();
	const studentParams = useStudentParams();
	const setSeed = useAssistantStudentForm((state) => state.setSeed);
	const [formError, setFormError] = useState("");
	const [studentId, setStudentId] = useState(
		card.action === "correct_student" ? initialId(card.matches) : "",
	);
	const mutation = useMutation(
		trpc.assistant.completeAccountAction.mutationOptions({
			retry: false,
			onSuccess: async () => {
				await Promise.all([
					refreshFinance(),
					client.invalidateQueries({
						queryKey: trpc.finance.getStudentOpenCharges.queryKey(),
					}),
					client.invalidateQueries({
						queryKey: trpc.assistant.proposals.queryKey(),
					}),
					client.invalidateQueries({
						queryKey: trpc.assistant.salaryOptions.queryKey(),
					}),
				]);
			},
		}),
	);
	function save(selection: Submission) {
		if (busy || !draftId || mutation.isPending || mutation.isSuccess) return;
		const parsed = accountActionSubmission.safeParse(selection);
		if (!parsed.success) {
			setFormError("Check the amount, selections, and required fields.");
			return;
		}
		setFormError("");
		mutation.mutate({ draftId, selection: parsed.data });
	}
	if (card.action === "register_student") {
		return (
			<div className="grid gap-2 text-sm">
				<p>{card.name}</p>
				{card.classroom && <p>{card.classroom}</p>}
				{card.fees.map((fee) => (
					<p key={fee.name}>
						{fee.name} · {formatter.format(fee.amount)}
					</p>
				))}
				<Button
					type="button"
					className="justify-self-start"
					onClick={() => {
						setSeed({ kind: "register", input: card });
						void studentParams.setParams({
							createStudent: true,
							createStudentPrefillName: null,
							createStudentReturnTo: "assistant",
						});
					}}
				>
					Open registration form
				</Button>
			</div>
		);
	}
	if (card.action === "correct_student") {
		return (
			<div className="grid gap-2">
				<PersonPicker
					label="Student to correct"
					matches={card.matches}
					value={studentId}
					onChange={setStudentId}
				/>
				<Button
					type="button"
					className="justify-self-start"
					disabled={!studentId}
					onClick={() => {
						setSeed({ kind: "correct", studentId, input: card });
						void studentParams.setParams({ studentEditId: studentId });
					}}
				>
					Open student information
				</Button>
			</div>
		);
	}
	if (status === "completed" || mutation.isSuccess)
		return <output className="text-sm">Recorded in School Clerk.</output>;
	if (
		!draftId ||
		(status && status !== "pending") ||
		(expiresAt && new Date(expiresAt).getTime() <= Date.now())
	)
		return (
			<p className="text-sm">This draft is closed. Ask for a new review.</p>
		);

	return (
		<div className="grid gap-2">
			{card.action === "student_payment" && (
				<StudentPaymentForm
					card={card}
					pending={busy || mutation.isPending}
					save={save}
				/>
			)}
			{card.action === "staff_payment" && (
				<SalaryForm
					card={card}
					pending={busy || mutation.isPending}
					save={save}
				/>
			)}
			{card.action === "transfer" && (
				<TransferForm
					card={card}
					pending={busy || mutation.isPending}
					save={save}
				/>
			)}
			{(formError || mutation.error) && (
				<p role="alert" className="text-sm text-destructive">
					{formError || mutation.error?.message}
				</p>
			)}
		</div>
	);
}

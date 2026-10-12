"use client";
import { z } from "zod";
import { ResultDetails } from "./assistant-results";
const students = z.array(
	z.object({
		id: z.string(),
		fullName: z.string(),
		classroom: z.string().nullable(),
		isEnrolledThisTerm: z.boolean(),
	}),
);
const classrooms = z.array(
	z.object({
		displayName: z.string(),
		className: z.string(),
		streamName: z.string().nullable().optional(),
	}),
);
const inventory = z.array(
	z.object({
		id: z.string(),
		title: z.string(),
		quantity: z.number(),
		isLowStock: z.boolean(),
	}),
);
const fees = z.object({
	studentName: z.string(),
	totalPending: z.number(),
	fees: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			billAmount: z.number(),
			paidAmount: z.number(),
			pendingAmount: z.number(),
		}),
	),
});
function RecordTable({
	headers,
	rows,
}: { headers: string[]; rows: React.ReactNode[][] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr>
						{headers.map((h) => (
							<th key={h} className="border-b px-2 py-2 font-medium">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Results are immutable, noninteractive table snapshots.
						<tr key={i}>
							{row.map((v, j) => (
								<td key={headers[j]} className="border-b px-2 py-2 align-top">
									{v}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			{!rows.length && (
				<p className="py-3 text-sm text-muted-foreground">
					No matching records.
				</p>
			)}
		</div>
	);
}
const number = (value: number) =>
	new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
export function AssistantRecords({
	toolId,
	data,
}: { toolId: string; data: unknown }) {
	if (toolId === "listClassrooms") {
		const parsed = classrooms.safeParse(data);
		if (parsed.success)
			return (
				<RecordTable
					headers={["Classroom", "Stream"]}
					rows={parsed.data.map((row) => [
						row.displayName,
						row.streamName === row.className ? "—" : (row.streamName ?? "—"),
					])}
				/>
			);
	}
	if (toolId === "searchStudents") {
		const parsed = students.safeParse(data);
		if (parsed.success)
			return (
				<RecordTable
					headers={["Student", "Classroom", "Enrollment"]}
					rows={parsed.data.map((s) => [
						s.fullName,
						s.classroom ?? "Unassigned",
						s.isEnrolledThisTerm ? "Enrolled" : "Not enrolled",
					])}
				/>
			);
	}
	if (toolId === "searchInventoryItems") {
		const parsed = inventory.safeParse(data);
		if (parsed.success)
			return (
				<RecordTable
					headers={["Item", "Available", "Stock"]}
					rows={parsed.data.map((s) => [
						s.title,
						number(s.quantity),
						s.isLowStock ? "Low stock" : "In stock",
					])}
				/>
			);
	}
	if (toolId === "getStudentPaymentData") {
		const parsed = fees.safeParse(data);
		if (parsed.success)
			return (
				<>
					<p className="mb-3 font-medium">
						{parsed.data.studentName} · Outstanding{" "}
						{number(parsed.data.totalPending)}
					</p>
					<RecordTable
						headers={["Fee", "Billed", "Paid", "Balance"]}
						rows={parsed.data.fees.map((f) => [
							f.title,
							number(f.billAmount),
							number(f.paidAmount),
							number(f.pendingAmount),
						])}
					/>
				</>
			);
	}
	return <ResultDetails value={data} />;
}

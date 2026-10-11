import { describe, expect, test } from "bun:test";
import { getStudentSuggestions } from "./student-suggestions";

type Student = ReturnType<typeof student>;
function student(
	id: string,
	name: string,
	surname: string,
	otherName = "",
	schoolProfileId = "school-1",
) {
	return {
		id,
		name,
		surname,
		otherName,
		schoolProfileId,
		deletedAt: null as Date | null,
		dob: null,
		guardians: [],
		sessionForms: [] as Array<{
			termForms: Array<{
				id: string;
				studentId: string | null;
				registrationReviewStatus: "APPROVED" | "PENDING";
				classroomDepartment: {
					id: string;
					departmentName: string;
					schoolProfileId: string;
					deletedAt: Date | null;
					classRoom: {
						name: string;
						schoolProfileId: string;
						schoolSessionId: string;
						deletedAt: Date | null;
					};
				};
			}>;
		}>,
	};
}

function matches(row: Student, filter: Record<string, unknown>): boolean {
	return Object.entries(filter).every(([key, value]) => {
		if (key === "AND")
			return (value as Record<string, unknown>[]).every((part) =>
				matches(row, part),
			);
		if (key === "OR")
			return (value as Record<string, unknown>[]).some((part) =>
				matches(row, part),
			);
		if (key === "NOT") return !matches(row, value as Record<string, unknown>);
		const field = row[key as keyof Student];
		if (value === null || typeof value !== "object") return field === value;
		const operation = value as { contains?: string; equals?: string };
		const text = String(field).toLowerCase();
		return operation.equals !== undefined
			? text === operation.equals.toLowerCase()
			: operation.contains !== undefined &&
					text.includes(operation.contains.toLowerCase());
	});
}

function database(rows: Student[]) {
	const reads: Array<{ skip: number; take: number }> = [];
	const db = {
		students: {
			count: async ({ where }: { where: Record<string, unknown> }) =>
				rows.filter((row) => matches(row, where)).length,
			findMany: async ({
				where,
				skip,
				take,
			}: { where: Record<string, unknown>; skip: number; take: number }) => {
				reads.push({ skip, take });
				return rows
					.filter((row) => matches(row, where))
					.sort((a, b) => a.id.localeCompare(b.id))
					.slice(skip, skip + take);
			},
		},
	} as unknown as Parameters<typeof getStudentSuggestions>[0];
	return { db, reads };
}
const input = {
	schoolId: "school-1",
	sessionId: "session-1",
	termId: "term-1",
	name: "Ahmad",
	surname: "Bello",
	otherName: "",
	pageSize: 2,
};

describe("student suggestions", () => {
	test("ranks all entered name fields before weaker surname/first-name matches, across pages", async () => {
		const { db } = database([
			student("a", "Ahmad", "Ali"),
			student("b", "Yusuf", "Bello"),
			student("c", "Ahmad", "Bello"),
			student("d", "Ahmad", "Bello", "Yusuf"),
			student("e", "Ahmadu", "Bello"),
		]);
		const first = await getStudentSuggestions(db, input);
		expect(first.data.map((row) => row.id)).toEqual(["c", "d"]);
		expect(first.meta).toMatchObject({ count: 5, matchingCount: 3 });
		const second = await getStudentSuggestions(db, {
			...input,
			cursor: first.meta.cursor,
		});
		expect(second.data.map((row) => row.id)).toEqual(["e", "a"]);
		expect(second.data.map((row) => row.match)).toEqual(["name", "partial"]);
		const third = await getStudentSuggestions(db, {
			...input,
			cursor: second.meta.cursor,
		});
		expect(third.data.map((row) => row.id)).toEqual(["b"]);
		expect(third.meta.cursor).toBeNull();
	});

	test("surname and other-name refinements promote the right record", async () => {
		const { db } = database([
			student("a", "Ahmad", "Bello"),
			student("b", "Ahmad", "Bello", "Yusuf"),
		]);
		const result = await getStudentSuggestions(db, {
			...input,
			name: " ahmad ",
			otherName: "Yusuf",
		});
		expect(result.data[0]).toMatchObject({ id: "b", match: "exact" });
		expect(result.data[1]).toMatchObject({ id: "a", match: "partial" });
	});

	test("never returns another school's or deleted students and does not issue an empty continuation", async () => {
		const archived = student("b", "Ahmad", "Bello");
		archived.deletedAt = new Date();
		const { db } = database([
			student("a", "Ahmad", "Bello"),
			archived,
			student("c", "Ahmad", "Bello", "", "school-2"),
		]);
		const result = await getStudentSuggestions(db, { ...input, pageSize: 1 });
		expect(result.data.map((row) => row.id)).toEqual(["a"]);
		expect(result.meta).toMatchObject({ count: 1, cursor: null });
	});

	test("includes enrolled students with an editable current class and distinguishes pending/ambiguous links", async () => {
		const enrolled = student("a", "Ahmad", "Bello");
		const form = {
			id: "term-form-1",
			studentId: "a",
			registrationReviewStatus: "APPROVED" as const,
			classroomDepartment: {
				id: "class-a",
				departmentName: "A",
				schoolProfileId: "school-1",
				deletedAt: null,
				classRoom: {
					name: "Primary 3",
					schoolProfileId: "school-1",
					schoolSessionId: "session-1",
					deletedAt: null,
				},
			},
		};
		enrolled.sessionForms = [{ termForms: [form] }];
		const pending = student("b", "Ahmad", "Bello");
		pending.sessionForms = [
			{
				termForms: [
					{ ...form, studentId: "b", registrationReviewStatus: "PENDING" },
				],
			},
		];
		const ambiguous = student("c", "Ahmad", "Bello");
		ambiguous.sessionForms = [
			{
				termForms: [
					{ ...form, studentId: "c" },
					{ ...form, id: "term-form-2", studentId: "c" },
				],
			},
		];
		const { db } = database([enrolled, pending, ambiguous]);
		const result = await getStudentSuggestions(db, { ...input, pageSize: 5 });
		expect(result.data[0]).toMatchObject({
			status: "enrolled",
			classroomName: "Primary 3 A",
			termFormId: "term-form-1",
		});
		expect(result.data[1]).toMatchObject({
			status: "pending approval",
			termFormId: null,
		});
		expect(result.data[2]).toMatchObject({
			status: "needs review",
			termFormId: null,
			classroomName: null,
		});
	});

	test("supports more than five matches while keeping each query bounded", async () => {
		const { db, reads } = database(
			Array.from({ length: 12 }, (_, index) =>
				student(String(index).padStart(2, "0"), "Ahmad", "Bello"),
			),
		);
		const seen: string[] = [];
		let cursor: string | null | undefined;
		do {
			const result = await getStudentSuggestions(db, {
				...input,
				pageSize: 5,
				cursor,
			});
			seen.push(...result.data.map((row) => row.id));
			cursor = result.meta.cursor;
		} while (cursor);
		expect(new Set(seen).size).toBe(12);
		expect(reads.every((read) => read.take <= 5)).toBe(true);
	});
});

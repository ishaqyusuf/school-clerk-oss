import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import { MODULE_IDS } from "@school-clerk/utils/module-config";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const {
	bulkChangeStudentClass,
	changeStudentGender,
	createStudent,
	createStudentSchema,
	executeStudentImport,
	getStudentImportJob,
	getStudents,
	getStudentsQueryParams,
	processStudentImportJob,
	setStudentAdmissionType,
	startStudentImportJob,
	verifyStudentImport,
} = await import("./students");
const { getStudentsSchema } = await import("../../trpc/schemas/students");
const { getStudentDuplicateGroups, previewStudentDuplicateMerge } =
	await import("./student-duplicates");

const registrarActor = { id: "registrar-1", role: "Registrar", authSessionId: "auth-session-registrar" };
const teacherActor = { id: "teacher-1", role: "Teacher", authSessionId: "auth-session-teacher" };

// Required new-admission fees for classroom A, each on its own credit stream.
function financeFeeTables(fees: Array<{ id: string; name: string; amount: number; schoolProfileId?: string }>) {
	return {
		financeStream: fees.map(({ id, schoolProfileId = "school-1" }) => ({
			id: `stream-${id}`, schoolProfileId, accountType: "CREDIT", deletedAt: null })),
		financeItem: fees.map(({ id, name, amount, schoolProfileId = "school-1" }) => ({
			id, name, description: null, amount, schoolProfileId, streamId: `stream-${id}`,
			collectable: true, isActive: true, studentAudience: "NEW_ADMISSIONS_ONLY", studentGenderAudience: "ALL_GENDERS",
			schoolSessionId: "session-1", sessionTermId: "term-1", deletedAt: null })),
		financeItemClassRoomDepartment: fees.map(({ id }) => ({
			id: `${id}-classroom-a`, itemId: id, classRoomDepartmentId: "classroom-a", deletedAt: null })),
	};
}

describe("createStudent fee collection", () => {
	type CreateStudentInput = Parameters<typeof createStudent>[1];
	const registrationInput = (payment: Pick<CreateStudentInput, "feePayments" | "paymentDetails">): CreateStudentInput => ({
		name: "Amina",
		surname: "Yusuf",
		otherName: null,
		gender: "Female",
		dob: null,
		classRoomId: "classroom-a",
		admissionType: "NEW_ADMISSION",
		selectedOptionalFeeItemIds: [],
		fees: [],
		guardian: null,
		termForms: null,
		...payment,
	});
	const entranceFee = { id: "entrance-fee", name: "Entrance form fee", amount: 5_000 };
	const matriculationFee = { id: "matriculation-fee", name: "Matriculation fee", amount: 20_000 };

	test("rejects inline payment from a non-finance role before writing anything", async () => {
		const { ctx, tables } = createImportCtx({ actor: registrarActor, tables: financeFeeTables([entranceFee]) });

		await expect(
			createStudent(ctx, registrationInput({
				feePayments: [{ feeItemId: "entrance-fee", amount: 5_000 }],
				paymentDetails: { method: "CASH" },
			})),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(tables.students).toHaveLength(3);
		expect(tables.studentTermForm).toHaveLength(1);
		expect(tables.financeCharge).toEqual([]);
	});

	test("assigns all required classroom fees and pays only the selected fee", async () => {
		const { ctx, tables } = createImportCtx({ tables: financeFeeTables([entranceFee, matriculationFee]) });

		const result = await createStudent(ctx, registrationInput({
			feePayments: [{ feeItemId: "entrance-fee", amount: 5_000 }],
			paymentDetails: {
				method: "CASH",
				reference: "RCPT-1",
				paymentDate: new Date("2026-08-02"),
			},
		}));

		const termForm = tables.studentTermForm!.find((form) => form.studentId === result.id);
		const charges = tables.financeCharge!;
		expect(charges.map((charge) => ({
			itemId: charge.itemId,
			studentTermFormId: charge.studentTermFormId,
			amountPaid: Number(charge.amountPaid),
			status: charge.status,
		}))).toEqual([
			{ itemId: "entrance-fee", studentTermFormId: termForm?.id, amountPaid: 5_000, status: "PAID" },
			{ itemId: "matriculation-fee", studentTermFormId: termForm?.id, amountPaid: 0, status: "PENDING" },
		]);
		expect(tables.financePaymentAllocation!.map((allocation) => ({
			paymentId: allocation.paymentId,
			chargeId: allocation.chargeId,
			amount: Number(allocation.amount),
		}))).toEqual([{ paymentId: "payment-1", chargeId: charges[0]!.id, amount: 5_000 }]);
		expect(tables.financePayment).toMatchObject([{ studentId: result.id, reference: "RCPT-1", receivedById: "user-1" }]);
		expect(result.feePaymentSummary).toEqual({
			paymentIds: ["payment-1"],
			count: 1,
			totalAssigned: 25_000,
			totalAllocated: 5_000,
			remainingBalance: 20_000,
		});
	});

	test("rejects a requested fee outside the tenant classroom scope", async () => {
		const { ctx, tables } = createImportCtx({
			tables: financeFeeTables([{ id: "other-school-fee", name: "Other school fee", amount: 5_000, schoolProfileId: "school-2" }]),
		});
		let transactionCommitted = false;
		const transaction = ctx.db.$transaction;
		ctx.db.$transaction = async (...args: unknown[]) => {
			const result = await transaction(...args);
			transactionCommitted = true;
			return result;
		};

		await expect(
			createStudent(ctx, registrationInput({
				feePayments: [{ feeItemId: "other-school-fee", amount: 5_000 }],
				paymentDetails: { method: "CASH" },
			})),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "A selected fee no longer applies. Refresh the form before trying again.",
		});
		expect(transactionCommitted).toBe(false);
		expect(tables.financeCharge).toEqual([]);
		expect(tables.financePaymentAllocation).toEqual([]);
	});

	test("requires shared payment details when a fee payment is entered", () => {
		const parsed = createStudentSchema.safeParse({
			name: "Amina",
			surname: "Yusuf",
			gender: "Female",
			classRoomId: "classroom-1",
			admissionType: "NEW_ADMISSION",
			feePayments: [{ feeItemId: "entrance-fee", amount: 5_000 }],
		});

		expect(parsed.success).toBe(false);
	});
});

describe("changeStudentGender", () => {
	const genders = (tables: Record<string, ImportRecord[]>) =>
		Object.fromEntries(tables.students!.map((student) => [student.id, student.gender]));

	test("updates by tenant-scoped student id for permitted roles", async () => {
		const { ctx, tables } = createImportCtx();

		await expect(
			changeStudentGender(ctx, { id: "student-1", gender: "Female" }),
		).resolves.toMatchObject({
			studentId: "student-1",
			updated: 1,
			genderChanged: true,
			reconciliation: [{ studentTermFormId: "term-form-1", applied: 0, cancelled: 0, retained: 0 }],
		});
		expect(genders(tables)).toEqual({ "student-1": "Female", "student-2": "Female", "student-3": "Female" });
	});

	test("rejects teacher updates", async () => {
		const { ctx, tables } = createImportCtx({ actor: teacherActor });

		await expect(
			changeStudentGender(ctx, { id: "student-1", gender: "Female" }),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
		expect(genders(tables)["student-1"]).toBe("Male");
	});

	test("does not report success for cross-tenant students", async () => {
		const { ctx, tables } = createImportCtx({
			tables: { students: [{ id: "other-student", name: "Musa", surname: "Ali", otherName: null,
				gender: "Male", schoolProfileId: "school-2", deletedAt: null }] },
		});

		await expect(
			changeStudentGender(ctx, { id: "other-student", gender: "Female" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<TRPCError>);
		expect(genders(tables)["other-student"]).toBe("Male");
	});
});

describe("getStudents", () => {
	function createStudentListContext() {
		const countCalls: any[] = [];
		const findManyCalls: any[] = [];
		const ctx = {
			profile: {
				schoolId: "school-1",
				sessionId: "session-current",
				termId: "term-current",
			},
			db: {
				students: {
					count: async (args: any) => {
						countCalls.push(args);
						return 0;
					},
					findMany: async (args: any) => {
						findManyCalls.push(args);
						return [];
					},
				},
			},
		} as any;

		return { ctx, countCalls, findManyCalls };
	}

	test("keeps the unfiltered directory non-restrictive", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, {});

		expect(countCalls[0]?.where).toEqual({
			schoolProfileId: "school-1",
			deletedAt: null,
		});
	});

	test("matches period and date criteria on the same active enrollment", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, {
			sessionId: "session-2025",
			sessionTermId: "term-2025-2",
			enrollmentDate: ["2025-01-10", "2025-01-20"],
		});

		expect(countCalls[0]?.where).toEqual({
			AND: [
				{ schoolProfileId: "school-1", deletedAt: null },
				{
					termForms: {
						some: {
							schoolProfileId: "school-1",
							deletedAt: null,
							schoolSessionId: "session-2025",
							sessionTermId: "term-2025-2",
							createdAt: {
								gte: new Date("2025-01-10T00:00:00.000Z"),
								lte: new Date("2025-01-20T23:59:59.999Z"),
							},
						},
					},
				},
			],
		});
	});

	test("searches all active enrollment history when only a date is supplied", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, { enrollmentDate: ["2025-01-10"] });

		expect(countCalls[0]?.where).toEqual({
			AND: [
				{ schoolProfileId: "school-1", deletedAt: null },
				{
					termForms: {
						some: {
							schoolProfileId: "school-1",
							deletedAt: null,
							createdAt: {
								gte: new Date("2025-01-10T00:00:00.000Z"),
								lte: new Date("2025-01-10T23:59:59.999Z"),
							},
						},
					},
				},
			],
		});
	});

	test("keeps contradictory enrollment and not-enrolled filters deterministic", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, {
			enrollmentDate: ["2025-01-10"],
			status: "not enrolled",
		});

		const enrollmentScope = countCalls[0]?.where?.AND?.[1]?.termForms?.some;
		const notEnrolledScope = countCalls[0]?.where?.AND?.[2]?.termForms?.none;

		expect(notEnrolledScope).toEqual(enrollmentScope);
	});

	test("composes period, date, classroom, and admission filters on one enrollment", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, {
			sessionId: "session-2025",
			enrollmentDate: ["2025-01-10"],
			departmentTitles: ["Primary"],
			classroomTitle: "One",
			admissionTypes: ["NEW_ADMISSION"],
		});

		expect(countCalls[0]?.where?.AND).toHaveLength(2);
		expect(countCalls[0]?.where?.AND?.[1]?.termForms?.some).toEqual({
			schoolProfileId: "school-1",
			deletedAt: null,
			schoolSessionId: "session-2025",
			createdAt: {
				gte: new Date("2025-01-10T00:00:00.000Z"),
				lte: new Date("2025-01-10T23:59:59.999Z"),
			},
			classroomDepartment: {
				AND: [{ departmentName: "Primary" }, { classRoom: { name: "One" } }],
			},
			admissionType: { in: ["NEW_ADMISSION"] },
		});
	});

	test("filters by an enrolled session without falling back to the active term", async () => {
		const { ctx, countCalls, findManyCalls } = createStudentListContext();

		await getStudents(ctx, { sessionId: "session-2025" });

		expect(countCalls[0]?.where).toEqual({
			AND: [
				{ schoolProfileId: "school-1", deletedAt: null },
				{
					termForms: {
						some: {
							schoolProfileId: "school-1",
							deletedAt: null,
							schoolSessionId: "session-2025",
						},
					},
				},
			],
		});
		expect(findManyCalls[0]?.select?.termForms?.where).toEqual({
			deletedAt: null,
			schoolSessionId: "session-2025",
		});
	});

	test("filters by an enrolled term without requiring a separate status", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, { sessionTermId: "term-2025-2" });

		expect(countCalls[0]?.where).toEqual({
			AND: [
				{ schoolProfileId: "school-1", deletedAt: null },
				{
					termForms: {
						some: {
							schoolProfileId: "school-1",
							deletedAt: null,
							sessionTermId: "term-2025-2",
						},
					},
				},
			],
		});
	});

	test("resolves the today preset to inclusive day boundaries", async () => {
		const { ctx, countCalls } = createStudentListContext();

		await getStudents(ctx, { enrollmentDate: ["today"] });

		const createdAt =
			countCalls[0]?.where?.AND?.[1]?.termForms?.some?.createdAt;
		expect(createdAt.gte.getHours()).toBe(0);
		expect(createdAt.gte.getMinutes()).toBe(0);
		expect(createdAt.lte.getHours()).toBe(23);
		expect(createdAt.lte.getMinutes()).toBe(59);
		expect(createdAt.gte.toDateString()).toBe(new Date().toDateString());
		expect(createdAt.lte.toDateString()).toBe(new Date().toDateString());
	});

	test("validates enrollment date values and ordering", () => {
		expect(
			getStudentsSchema.safeParse({ enrollmentDate: ["today"] }).success,
		).toBe(true);
		expect(
			getStudentsSchema.safeParse({ enrollmentDate: ["2025-01-10"] }).success,
		).toBe(true);
		expect(
			getStudentsSchema.safeParse({
				enrollmentDate: ["2025-01-10", "2025-01-20"],
			}).success,
		).toBe(true);
		expect(
			getStudentsSchema.safeParse({
				enrollmentDate: ["2025-01-20", "2025-01-10"],
			}).success,
		).toBe(false);
		expect(
			getStudentsSchema.safeParse({ enrollmentDate: ["not-a-date"] }).success,
		).toBe(false);
	});

	test("defaults active session and term for classroom-only filters", async () => {
		const countCalls: any[] = [];
		const findManyCalls: any[] = [];
		const ctx = {
			profile: {
				schoolId: "school-1",
				sessionId: "session-1",
				termId: "term-1",
			},
			db: {
				students: {
					count: async (args: any) => {
						countCalls.push(args);
						return 0;
					},
					findMany: async (args: any) => {
						findManyCalls.push(args);
						return [];
					},
				},
			},
		} as any;

		await getStudents(ctx, { departmentId: "classroom-a" });

		expect(countCalls[0]?.where).toMatchObject({
			AND: [
				{
					schoolProfileId: "school-1",
					deletedAt: null,
				},
				{
					termForms: {
						some: {
							deletedAt: null,
							sessionTermId: "term-1",
							classroomDepartmentId: "classroom-a",
						},
					},
				},
			],
		});
		expect(findManyCalls[0]?.select?.sessionForms?.where).toEqual({
			schoolSessionId: "session-1",
		});
		expect(findManyCalls[0]?.orderBy).toEqual([
			{ name: "asc" },
			{ surname: { sort: "asc", nulls: "last" } },
			{ otherName: { sort: "asc", nulls: "last" } },
			{ id: "asc" },
		]);
	});

	test("uses only allowlisted typed sort fields", async () => {
		const findManyCalls: any[] = [];
		const ctx = {
			profile: {
				schoolId: "school-1",
				sessionId: "session-1",
				termId: "term-1",
			},
			db: {
				students: {
					count: async () => 0,
					findMany: async (args: any) => {
						findManyCalls.push(args);
						return [];
					},
				},
			},
		} as any;

		await getStudents(ctx, { sort: ["dob", "desc"] });

		expect(findManyCalls[0]?.orderBy).toEqual([
			{ dob: { sort: "desc", nulls: "last" } },
			{ id: "asc" },
		]);
	});

	test("filters admission status on the selected term record", async () => {
		const countCalls: any[] = [];
		const ctx = {
			profile: {
				schoolId: "school-1",
				sessionId: "session-1",
				termId: "term-1",
			},
			db: {
				students: {
					count: async (args: any) => {
						countCalls.push(args);
						return 0;
					},
					findMany: async () => [],
				},
			},
		} as any;

		await getStudents(ctx, {
			admissionTypes: ["NEW_ADMISSION", "UNCLASSIFIED"],
		});

		expect(countCalls[0]?.where).toMatchObject({
			AND: [
				{ schoolProfileId: "school-1", deletedAt: null },
				{
					termForms: {
						some: {
							deletedAt: null,
							sessionTermId: "term-1",
							admissionType: {
								in: ["NEW_ADMISSION", "UNCLASSIFIED"],
							},
						},
					},
				},
			],
		});
	});
});

describe("getStudentsQueryParams", () => {
	test("returns linked enrolled-period and enrollment-date filters", async () => {
		const sessionCalls: any[] = [];
		const ctx = {
			profile: { schoolId: "school-1" },
			db: {
				schoolSession: {
					findMany: async (args: any) => {
						sessionCalls.push(args);
						return [
							{
								id: "session-1",
								title: "2025/2026",
								terms: [{ id: "term-1", title: "First Term" }],
								classRooms: [],
							},
						];
					},
				},
			},
		} as any;

		const filters = await getStudentsQueryParams(ctx);

		expect(sessionCalls[0]).toMatchObject({
			where: { schoolId: "school-1", deletedAt: null },
			orderBy: [
				{ startDate: { sort: "desc", nulls: "last" } },
				{ createdAt: { sort: "desc", nulls: "last" } },
				{ title: "desc" },
			],
			select: {
				terms: {
					where: { deletedAt: null },
					orderBy: [
						{ startDate: { sort: "asc", nulls: "last" } },
						{ createdAt: { sort: "asc", nulls: "last" } },
						{ title: "asc" },
					],
				},
			},
		});
		expect(filters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: "Enrolled session",
					value: "sessionId",
				}),
				expect.objectContaining({
					label: "Enrolled term",
					value: "sessionTermId",
					options: [
						{
							label: "First Term | 2025/2026",
							subLabel: "2025/2026",
							value: "term-1",
							parentValue: "session-1",
						},
					],
				}),
				{
					label: "Enrollment date",
					type: "date-range",
					value: "enrollmentDate",
				},
			]),
		);
	});
});

describe("setStudentAdmissionType", () => {
	test("tenant-scopes the term update and refuses incomplete fee context", async () => {
		const { ctx, tables } = createImportCtx({
			tables: {
				studentSessionForm: [
					{ id: "session-form-2", studentId: "student-2", schoolProfileId: "school-1",
						schoolSessionId: "session-1", classroomDepartmentId: null, deletedAt: null },
					{ id: "other-session-form", studentId: "other-student", schoolProfileId: "school-2",
						schoolSessionId: "other-session", classroomDepartmentId: null, deletedAt: null },
				],
				studentTermForm: [
					// Without a class placement the term's fees cannot be reconciled.
					{ id: "term-form-2", studentId: "student-2", studentSessionFormId: "session-form-2",
						schoolProfileId: "school-1", schoolSessionId: "session-1", sessionTermId: "term-1",
						classroomDepartmentId: null, admissionType: "UNCLASSIFIED", deletedAt: null },
					{ id: "other-term-form", studentId: "other-student", studentSessionFormId: "other-session-form",
						schoolProfileId: "school-2", schoolSessionId: "other-session", sessionTermId: "other-term",
						classroomDepartmentId: null, admissionType: "UNCLASSIFIED", deletedAt: null },
				],
			},
		});

		await expect(
			setStudentAdmissionType(ctx, { studentTermFormId: "term-form-1", admissionType: "RETURNING" }),
		).resolves.toMatchObject({ updated: 1, alreadyClassified: 0, termFormIds: ["term-form-1"] });
		await expect(
			setStudentAdmissionType(ctx, { studentTermFormId: "other-term-form", admissionType: "RETURNING" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			setStudentAdmissionType(ctx, { studentTermFormId: "term-form-2", admissionType: "RETURNING" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(Object.fromEntries(tables.studentTermForm!.map((form) => [form.id, form.admissionType]))).toEqual({
			"term-form-1": "RETURNING",
			"term-form-2": "UNCLASSIFIED",
			"other-term-form": "UNCLASSIFIED",
		});
	});
});

describe("bulkChangeStudentClass", () => {
	const placements = (tables: Record<string, ImportRecord[]>) => ({
		termForm: tables.studentTermForm![0]!.classroomDepartmentId,
		sessionForm: tables.studentSessionForm![0]!.classroomDepartmentId,
	});

	test("moves tenant-owned term forms and their session form atomically", async () => {
		const { ctx, tables } = createImportCtx();

		await expect(
			bulkChangeStudentClass(ctx, {
				studentTermFormIds: ["term-form-1"],
				classroomDepartmentId: "classroom-b",
			}),
		).resolves.toMatchObject({
			count: 1,
			alreadyInClass: 0,
			sessionFormCount: 1,
			studentIds: ["student-1"],
			classroomDepartmentId: "classroom-b",
		});
		expect(placements(tables)).toEqual({ termForm: "classroom-b", sessionForm: "classroom-b" });
	});

	test("rejects roles that cannot manage students", async () => {
		const { ctx, tables } = createImportCtx({ actor: teacherActor });

		await expect(
			bulkChangeStudentClass(ctx, {
				studentTermFormIds: ["term-form-1"],
				classroomDepartmentId: "classroom-b",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(placements(tables)).toEqual({ termForm: "classroom-a", sessionForm: "classroom-a" });
	});

	test("rejects a target class from a different academic session", async () => {
		const { ctx, tables } = createImportCtx({
			tables: {
				schoolSession: [{ id: "session-2", title: "2027/2028", schoolId: "school-1", deletedAt: null }],
				classRoom: [{ id: "jss-2", name: "JSS 2", schoolProfileId: "school-1", schoolSessionId: "session-2", deletedAt: null }],
				classRoomDepartment: [{ id: "classroom-next", departmentName: "A", schoolProfileId: "school-1",
					classRoomsId: "jss-2", deletedAt: null }],
			},
		});

		await expect(
			bulkChangeStudentClass(ctx, {
				studentTermFormIds: ["term-form-1"],
				classroomDepartmentId: "classroom-next",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "Enrollment ownership or academic links need review. No class placements were changed.",
		});
		expect(placements(tables)).toEqual({ termForm: "classroom-a", sessionForm: "classroom-a" });
	});
});

type ImportRecord = Record<string, any>;
type ImportRelation = { model: string; many?: boolean; resolve: (row: ImportRecord) => any };

const scalarFilterKeys = new Set(["in", "notIn", "not", "gt", "gte", "lt", "lte", "equals", "mode"]);
const lowerCase = (value: any) => (typeof value === "string" ? value.toLowerCase() : value);

function matchesScalar(value: any, filter: any): boolean {
	if (filter === null) return value == null;
	if (filter instanceof Date) return value instanceof Date && value.getTime() === filter.getTime();
	if (typeof filter !== "object") return value === filter;
	if (filter.mode === "insensitive") {
		const { mode: _mode, ...rest } = filter;
		return matchesScalar(lowerCase(value), Object.fromEntries(Object.entries(rest).map(([op, operand]: [string, any]) =>
			[op, Array.isArray(operand) ? operand.map(lowerCase) : lowerCase(operand)])));
	}
	return Object.entries(filter).every(([op, operand]: [string, any]) => {
		switch (op) {
			case "equals": return matchesScalar(value, operand);
			case "in": return operand.includes(value);
			case "notIn": return !operand.includes(value);
			case "not": return !matchesScalar(value, operand);
			case "gt": return value != null && value > operand;
			case "gte": return value != null && value >= operand;
			case "lt": return value != null && value < operand;
			case "lte": return value != null && value <= operand;
			default: throw new Error(`Unsupported import fixture filter: ${op}`);
		}
	});
}

/**
 * In-memory Prisma stand-in for the student write paths (import, registration,
 * profile, class and admission changes). It evaluates the real
 * where/select shapes (relations, OR/AND, some/none) so access checks run unchanged.
 */
function createImportStore(tables: Record<string, ImportRecord[]>) {
	const now = new Date("2026-07-14T10:00:00.000Z");
	const byId = (model: string, id: unknown) => tables[model]!.find((row) => row.id === id) ?? null;
	const where = (model: string, key: string) => (row: ImportRecord) =>
		tables[model]!.filter((candidate) => candidate[key] === row.id);
	const relations: Record<string, Record<string, ImportRelation>> = {
		user: { tenant: { model: "tenant", resolve: (row) => byId("tenant", row.tenantId) } },
		session: { user: { model: "user", resolve: (row) => byId("user", row.userId) } },
		schoolProfile: {
			account: { model: "saasAccount", resolve: (row) => byId("saasAccount", row.accountId) },
			moduleConfiguration: { model: "schoolModuleConfiguration",
				resolve: (row) => tables.schoolModuleConfiguration!.find((config) => config.schoolProfileId === row.id) ?? null },
		},
		sessionTerm: { session: { model: "schoolSession", resolve: (row) => byId("schoolSession", row.sessionId) } },
		classRoom: { session: { model: "schoolSession", resolve: (row) => byId("schoolSession", row.schoolSessionId) } },
		classRoomDepartment: { classRoom: { model: "classRoom", resolve: (row) => byId("classRoom", row.classRoomsId) } },
		students: {
			termForms: { model: "studentTermForm", many: true, resolve: where("studentTermForm", "studentId") },
			sessionForms: { model: "studentSessionForm", many: true, resolve: where("studentSessionForm", "studentId") },
			guardians: { model: "studentGuardians", many: true, resolve: where("studentGuardians", "studentId") },
		},
		studentGuardians: { guardian: { model: "guardians", resolve: (row) => byId("guardians", row.guardiansId) } },
		financeItem: {
			stream: { model: "financeStream", resolve: (row) => byId("financeStream", row.streamId) },
			applicableClasses: { model: "financeItemClassRoomDepartment", many: true,
				resolve: where("financeItemClassRoomDepartment", "itemId") },
		},
		financeCharge: {
			stream: { model: "financeStream", resolve: (row) => byId("financeStream", row.streamId) },
			item: { model: "financeItem", resolve: (row) => byId("financeItem", row.itemId) },
			classroomDepartment: { model: "classRoomDepartment", resolve: (row) => byId("classRoomDepartment", row.classroomDepartmentId) },
			allocations: { model: "financePaymentAllocation", many: true, resolve: where("financePaymentAllocation", "chargeId") },
			ledgerEntries: { model: "financeLedgerEntry", many: true, resolve: where("financeLedgerEntry", "chargeId") },
		},
		studentSessionForm: {
			termForms: { model: "studentTermForm", many: true, resolve: where("studentTermForm", "studentSessionFormId") },
			classroomDepartment: { model: "classRoomDepartment", resolve: (row) => byId("classRoomDepartment", row.classroomDepartmentId) },
			schoolSession: { model: "schoolSession", resolve: (row) => byId("schoolSession", row.schoolSessionId) },
		},
		studentTermForm: {
			student: { model: "students", resolve: (row) => byId("students", row.studentId) },
			sessionForm: { model: "studentSessionForm", resolve: (row) => byId("studentSessionForm", row.studentSessionFormId) },
			sessionTerm: { model: "sessionTerm", resolve: (row) => byId("sessionTerm", row.sessionTermId) },
			schoolSession: { model: "schoolSession", resolve: (row) => byId("schoolSession", row.schoolSessionId) },
			classroomDepartment: { model: "classRoomDepartment", resolve: (row) => byId("classRoomDepartment", row.classroomDepartmentId) },
		},
	};

	function matches(model: string, row: ImportRecord, filter: any): boolean {
		if (!filter) return true;
		return Object.entries(filter).every(([key, value]: [string, any]) => {
			if (value === undefined) return true;
			if (key === "OR") return value.some((item: any) => matches(model, row, item));
			if (key === "AND") return value.every((item: any) => matches(model, row, item));
			const relation = relations[model]?.[key];
			if (!relation) {
				// `deletedAt: {}` is Prisma's "any value" filter.
				if (value && typeof value === "object" && !(value instanceof Date) && !Object.keys(value).length) return true;
				if (value && typeof value === "object" && !(value instanceof Date) &&
					!Object.keys(value).every((op) => scalarFilterKeys.has(op))) {
					throw new Error(`Import fixture has no relation ${model}.${key}`);
				}
				return matchesScalar(row[key], value);
			}
			const related = relation.resolve(row);
			if (relation.many) {
				if ("some" in value) return related.some((item: ImportRecord) => matches(relation.model, item, value.some));
				if ("none" in value) return !related.some((item: ImportRecord) => matches(relation.model, item, value.none));
				if ("every" in value) return related.every((item: ImportRecord) => matches(relation.model, item, value.every));
				throw new Error(`Unsupported list filter on ${model}.${key}`);
			}
			if (value === null) return related == null;
			return related != null && matches(relation.model, related, value);
		});
	}

	function sort(rows: ImportRecord[], orderBy: any) {
		const orders = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [])
			.flatMap((order: any) => Object.entries(order))
			// Relation and null-placement orderings do not change these fixtures; scalar keys do.
			.filter(([, direction]) => direction === "asc" || direction === "desc");
		return [...rows].sort((a, b) => {
			for (const [key, direction] of orders as [string, string][]) {
				if (a[key] === b[key]) continue;
				const result = a[key] > b[key] ? 1 : -1;
				return direction === "desc" ? -result : result;
			}
			return 0;
		});
	}

	function project(model: string, row: ImportRecord | null, args: any = {}): any {
		if (!row) return null;
		const fields: Record<string, any> = args.select ??
			{ ...Object.fromEntries(Object.keys(row).map((key) => [key, true])), ...args.include };
		const result: ImportRecord = {};
		for (const [key, field] of Object.entries(fields)) {
			if (!field || args.omit?.[key]) continue;
			const relation = relations[model]?.[key];
			if (!relation) {
				result[key] = row[key];
				continue;
			}
			const nested = field === true ? {} : field;
			const related = relation.resolve(row);
			result[key] = relation.many
				? sort(related.filter((item: ImportRecord) => matches(relation.model, item, nested.where)), nested.orderBy)
					.map((item) => project(relation.model, item, nested))
				: project(relation.model, related, nested);
		}
		return result;
	}

	const counters: Record<string, number> = {};
	const idPrefixes: Record<string, string> = {
		students: "new-student", studentSessionForm: "new-session-form", studentTermForm: "new-term-form",
		studentImportJob: "job", studentImportJobRow: "job-row", financeCharge: "charge", financePayment: "payment",
	};
	const createDefaults: Record<string, ImportRecord> = {
		studentImportJob: { status: "PENDING", errorMessage: null, triggerRunId: null },
		studentImportJobRow: { status: "PENDING", studentId: null, termSheetCreated: false, reason: null, completedAt: null },
		financeCharge: { amountPaid: 0, status: "PENDING", collectionStatus: "NOT_REQUIRED", cancelledAt: null },
		financePayment: { status: "PAID" },
	};
	const created: Record<string, ImportRecord[]> = {};
	const jobUpdates: Array<{ id: string; data: ImportRecord }> = [];

	function insert(model: string, data: ImportRecord) {
		counters[model] = (counters[model] ?? 0) + 1;
		const row = { id: `${idPrefixes[model] ?? model}-${counters[model]}`, deletedAt: null,
			createdAt: now, updatedAt: now, ...createDefaults[model], ...data };
		tables[model]!.push(row);
		(created[model] ??= []).push(data);
		return row;
	}

	function delegate(model: string) {
		tables[model] ??= [];
		const findAll = (args: any = {}) =>
			sort(tables[model]!.filter((row) => matches(model, row, args.where)), args.orderBy);
		const update = (row: ImportRecord, data: ImportRecord) => {
			if (model === "studentImportJob") jobUpdates.push({ id: row.id, data: { ...data } });
			Object.assign(row, data, { updatedAt: now });
		};
		return {
			findFirst: async (args: any = {}) => project(model, findAll(args)[0] ?? null, args),
			findFirstOrThrow: async (args: any = {}) => {
				const row = findAll(args)[0];
				if (!row) throw new Error(`Import fixture ${model}.findFirstOrThrow found no record`);
				return project(model, row, args);
			},
			findMany: async (args: any = {}) => findAll(args).slice(0, args.take).map((row) => project(model, row, args)),
			count: async (args: any = {}) => findAll(args).length,
			create: async (args: any) => project(model, insert(model, args.data), args),
			createMany: async ({ data }: any) => {
				for (const item of data) insert(model, item);
				return { count: data.length };
			},
			update: async (args: any) => {
				const row = findAll(args)[0];
				if (!row) throw new Error(`Import fixture ${model}.update found no record`);
				update(row, args.data);
				return project(model, row, args);
			},
			updateMany: async ({ where: filter, data }: any) => {
				const rows = findAll({ where: filter });
				for (const row of rows) update(row, data);
				return { count: rows.length };
			},
			groupBy: async ({ by, where: filter, _count }: any) => {
				const groups = new Map<string, ImportRecord>();
				for (const row of findAll({ where: filter })) {
					const key = JSON.stringify(by.map((field: string) => row[field]));
					const group = groups.get(key) ?? { ...Object.fromEntries(by.map((field: string) => [field, row[field]])),
						...(_count ? { _count: { _all: 0 } } : {}) };
					if (group._count) group._count._all += 1;
					groups.set(key, group);
				}
				return [...groups.values()];
			},
		};
	}

	// Each lock binds the row id plus its owner scope (school for students, job for job rows).
	const lockTables: Record<string, { model: string; scope?: string }> = {
		Students: { model: "students", scope: "schoolProfileId" },
		StudentImportJob: { model: "studentImportJob" },
		StudentImportJobRow: { model: "studentImportJobRow", scope: "jobId" },
	};
	const db: any = {
		// Row locks: return each live row whose id and owner scope are bound in the query.
		$queryRaw: async (query: { strings: string[]; values: unknown[] }) => {
			const table = query.strings.join("?").match(/FROM "(\w+)"/)?.[1];
			const lock = table ? lockTables[table] : undefined;
			if (!lock) throw new Error(`Import fixture cannot run raw query on ${table}`);
			return tables[lock.model]!.filter((row) => row.deletedAt == null && query.values.includes(row.id) &&
				(!lock.scope || query.values.includes(row[lock.scope]))).map((row) => ({ id: row.id }));
		},
		$executeRaw: async () => 0,
		$transaction: async (operation: any) =>
			typeof operation === "function" ? operation(db) : Promise.all(operation),
	};
	for (const model of [...Object.keys(tables), "financeItem", "financeCharge", "financeTermLedgerClose", "financeStream",
		"financeItemClassRoomDepartment", "financePayment", "financePaymentAllocation", "financeLedgerEntry",
		"schoolInventory", "inventoryIssuance", "studentGuardians", "guardians"]) {
		db[model] = delegate(model);
	}
	return { db, tables, created, jobUpdates };
}

type ImportActor = { id: string; role: string; authSessionId: string };
const adminActor: ImportActor = { id: "user-1", role: "Admin", authSessionId: "auth-session-1" };

/** Extra `tables` rows are appended to the base school, so a test adds records without replacing it. */
function createImportCtx({ actor = adminActor, tables = {} }: {
	actor?: ImportActor;
	tables?: Record<string, ImportRecord[]>;
} = {}) {
	const moduleIds = [...MODULE_IDS];
	const baseTables: Record<string, ImportRecord[]> = {
		tenant: [{ id: "tenant-1", deletedAt: null, qaPurgeStartedAt: null }],
		saasAccount: [{ id: "account-1", deletedAt: null, qaPurgeStartedAt: null }],
		user: [
			{ id: "user-1", role: "Admin", saasAccountId: "account-1", tenantId: "tenant-1", deletedAt: null },
			{ id: "teacher-1", role: "Teacher", saasAccountId: "account-1", tenantId: "tenant-1", deletedAt: null },
			{ id: "registrar-1", role: "Registrar", saasAccountId: "account-1", tenantId: "tenant-1", deletedAt: null },
		],
		session: [
			{ id: "auth-session-1", token: "auth-token-1", userId: "user-1", expiresAt: new Date("2099-01-01"), deletedAt: null },
			{ id: "auth-session-teacher", token: "auth-token-teacher", userId: "teacher-1", expiresAt: new Date("2099-01-01"), deletedAt: null },
			{ id: "auth-session-registrar", token: "auth-token-registrar", userId: "registrar-1", expiresAt: new Date("2099-01-01"), deletedAt: null },
		],
		schoolProfile: [{ id: "school-1", accountId: "account-1", studentNameFormat: null, deletedAt: null }],
		schoolModuleConfiguration: [{ schoolProfileId: "school-1", version: 1, revision: 1,
			enabledModules: moduleIds, entitledModules: moduleIds }],
		schoolSession: [{ id: "session-1", title: "2026/2027", schoolId: "school-1", deletedAt: null }],
		sessionTerm: [{ id: "term-1", title: "First Term", schoolId: "school-1", sessionId: "session-1",
			lifecycleStatus: "OPEN", deletedAt: null }],
		classRoom: [
			{ id: "jss-1", name: "JSS 1", schoolProfileId: "school-1", schoolSessionId: "session-1", deletedAt: null },
			{ id: "primary-1", name: "الأول الإبتدائي", schoolProfileId: "school-1", schoolSessionId: "session-1", deletedAt: null },
		],
		classRoomDepartment: [
			{ id: "classroom-a", departmentName: "A", schoolProfileId: "school-1", classRoomsId: "jss-1", deletedAt: null },
			{ id: "classroom-b", departmentName: "B", schoolProfileId: "school-1", classRoomsId: "jss-1", deletedAt: null },
			{ id: "primary-1-primary-1", departmentName: "الأول الإبتدائي", schoolProfileId: "school-1",
				classRoomsId: "primary-1", deletedAt: null },
		],
		students: [
			{ id: "student-1", name: "John", surname: "Doe", otherName: null, gender: "Male", schoolProfileId: "school-1", deletedAt: null },
			{ id: "student-2", name: "Mary", surname: "Major", otherName: null, gender: "Female", schoolProfileId: "school-1", deletedAt: null },
			{ id: "student-3", name: "Aisha", surname: "Bello", otherName: "Fatima", gender: "Female", schoolProfileId: "school-1", deletedAt: null },
		],
		// John is already enrolled this term in classroom A.
		studentSessionForm: [{ id: "session-form-1", studentId: "student-1", schoolProfileId: "school-1",
			schoolSessionId: "session-1", classroomDepartmentId: "classroom-a", deletedAt: null }],
		studentTermForm: [{ id: "term-form-1", studentId: "student-1", studentSessionFormId: "session-form-1",
			schoolProfileId: "school-1", schoolSessionId: "session-1", sessionTermId: "term-1",
			classroomDepartmentId: "classroom-a", admissionType: "UNCLASSIFIED", deletedAt: null,
			createdAt: new Date("2026-07-01T00:00:00.000Z") }],
		studentImportJob: [],
		studentImportJobRow: [],
	};
	for (const [model, rows] of Object.entries(tables)) baseTables[model] = [...(baseTables[model] ?? []), ...rows];
	const store = createImportStore(baseTables);
	const created = (model: string) => (store.created[model] ??= []);

	return {
		ctx: {
			profile: {
				schoolId: "school-1",
				sessionId: "session-1",
				termId: "term-1",
				authSessionId: actor.authSessionId,
			},
			currentUser: {
				id: actor.id,
				email: `${actor.id}@example.com`,
				name: actor.role,
				role: actor.role,
				saasAccountId: "account-1",
			},
			db: store.db,
		} as any,
		tables: store.tables,
		createdStudents: created("students"),
		createdSessionForms: created("studentSessionForm"),
		createdTermForms: created("studentTermForm"),
		jobs: store.tables.studentImportJob!,
		jobRows: store.tables.studentImportJobRow!,
		jobUpdates: store.jobUpdates,
	};
}

describe("verifyStudentImport", () => {
	test("returns a typed error for classroom ids outside the active tenant session", async () => {
		const { ctx } = createImportCtx();

		await expect(
			verifyStudentImport(ctx, {
				rows: [
					{
						lineNumber: 1,
						originalText: "Jane Doe",
						name: "Jane",
						surname: "Doe",
						gender: "Female",
						classroomDepartmentId: "missing-classroom",
					},
				],
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "A selected classroom is unavailable in the current school session.",
		} satisfies Partial<TRPCError>);
	});

	test("returns a typed error when active school session context is missing", async () => {
		const { ctx } = createImportCtx();
		ctx.profile.sessionId = undefined;

		await expect(
			verifyStudentImport(ctx, {
				rows: [
					{
						lineNumber: 1,
						originalText: "Jane Doe",
						name: "Jane",
						surname: "Doe",
						gender: "Female",
						classroomDepartmentId: "classroom-a",
					},
				],
			}),
		).rejects.toMatchObject({
			code: "UNAUTHORIZED",
			message: "An active school, session and term are required to review an import.",
		} satisfies Partial<TRPCError>);
	});

	test("uses each row target classroom for current-classroom matching", async () => {
		const { ctx } = createImportCtx();

		const report = await verifyStudentImport(ctx, {
			rows: [
				{
					lineNumber: 1,
					originalText: "John Doe",
					name: "John",
					surname: "Doe",
					gender: "Male",
					classroomDepartmentId: "classroom-a",
				},
				{
					lineNumber: 2,
					originalText: "John Doe",
					name: "John",
					surname: "Doe",
					gender: "Male",
					classroomDepartmentId: "classroom-b",
				},
			],
		});

		expect(report.results.map((row) => row.classroomDepartmentId)).toEqual([
			"classroom-a",
			"classroom-b",
		]);
		expect(
			report.results.map((row) => row.fullMatch?.isCurrentClassroomMatch),
		).toEqual([true, false]);
	});

	test("requires other name to match before reporting a full 100 percent match", async () => {
		const { ctx } = createImportCtx();

		const report = await verifyStudentImport(ctx, {
			rows: [
				{
					lineNumber: 1,
					originalText: "John Doe Junior",
					name: "John",
					surname: "Doe",
					otherName: "Junior",
					gender: "Male",
					classroomDepartmentId: "classroom-a",
				},
			],
		});

		expect(report.results[0]?.fullMatch).toBeNull();
		expect(report.results[0]?.status).toBe("needsAttention");
		expect(report.results[0]?.suspectedMatches[0]).toMatchObject({
			id: "student-1",
			confidence: 70,
			reason: "First name and surname match exactly; other name differs",
		});
	});

	test("keeps 100 percent matches when name, surname, and other name all match", async () => {
		const { ctx } = createImportCtx();

		const report = await verifyStudentImport(ctx, {
			rows: [
				{
					lineNumber: 1,
					originalText: "Aisha Bello Fatima",
					name: "Aisha",
					surname: "Bello",
					otherName: "Fatima",
					gender: "Female",
					classroomDepartmentId: "classroom-a",
				},
			],
		});

		expect(report.results[0]?.fullMatch).toMatchObject({
			id: "student-3",
			confidence: 100,
			reason: "Exact match on first name, surname, and other name",
		});
		expect(report.results[0]?.suspectedMatches).toEqual([]);
	});
});

describe("executeStudentImport", () => {
	test("rejects teacher-triggered imports", async () => {
		const { ctx } = createImportCtx();
		// A live teacher session: the role comes from the session's user, not ctx.currentUser.role.
		ctx.profile.authSessionId = "auth-session-teacher";
		ctx.currentUser = {
			id: "teacher-1",
			email: "teacher@example.com",
			name: "Teacher",
			role: "Teacher",
			saasAccountId: "account-1",
		};

		await expect(
			executeStudentImport(ctx, {
				classroomDepartmentId: "classroom-a",
				rows: [],
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Import requires current student, academic and finance management access.",
		} satisfies Partial<TRPCError>);
	});

	test("returns a typed error when no target classroom is available", async () => {
		const { ctx } = createImportCtx();

		await expect(
			executeStudentImport(ctx, {
				rows: [
					{
						lineNumber: 1,
						name: "Jane",
						surname: "Doe",
						gender: "Female",
						action: "import_new",
					},
				],
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "Select an available classroom for every import row.",
		} satisfies Partial<TRPCError>);
	});

	test("returns a typed error for classrooms outside the active school", async () => {
		const { ctx } = createImportCtx();

		await expect(
			executeStudentImport(ctx, {
				rows: [
					{
						lineNumber: 1,
						name: "Jane",
						surname: "Doe",
						gender: "Female",
						classroomDepartmentId: "missing-classroom",
						action: "import_new",
					},
				],
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "An import classroom is unavailable in this school session.",
		} satisfies Partial<TRPCError>);
	});

	test("creates matched-student term sheets in each row target classroom", async () => {
		const { ctx, createdSessionForms, createdTermForms } = createImportCtx();

		const result = await executeStudentImport(ctx, {
			rows: [
				{
					lineNumber: 1,
					name: "Aisha",
					surname: "Bello",
					otherName: "Fatima",
					gender: "Female",
					classroomDepartmentId: "classroom-a",
					action: "keep_match",
					existingStudentId: "student-3",
				},
				{
					lineNumber: 2,
					name: "Mary",
					surname: "Major",
					gender: "Female",
					classroomDepartmentId: "classroom-b",
					action: "keep_match",
					existingStudentId: "student-2",
				},
			],
		});

		expect(result).toMatchObject({
			keptMatches: 2,
			termSheetsCreated: 2,
			failedRows: 0,
		});
		expect(
			createdSessionForms.map((form: any) => form.classroomDepartmentId),
		).toEqual(["classroom-a", "classroom-b"]);
		expect(
			createdTermForms.map((form: any) => form.classroomDepartmentId),
		).toEqual(["classroom-a", "classroom-b"]);
	});

	test("creates Arabic fallback-classroom female rows as new students", async () => {
		const { ctx, createdStudents, createdSessionForms, createdTermForms } =
			createImportCtx();

		const result = await executeStudentImport(ctx, {
			classroomDepartmentId: "primary-1-primary-1",
			rows: [
				{
					lineNumber: 2,
					name: "بلقيس",
					surname: "أحمد",
					gender: "Female",
					classroomDepartmentId: "primary-1-primary-1",
					action: "import_new",
				},
				{
					lineNumber: 3,
					name: "بلقيس",
					surname: "أونيكون",
					gender: "Female",
					classroomDepartmentId: "primary-1-primary-1",
					action: "import_new",
				},
				{
					lineNumber: 4,
					name: "بلقيس",
					surname: "إبراهيم",
					gender: "Female",
					classroomDepartmentId: "primary-1-primary-1",
					action: "import_new",
				},
				{
					lineNumber: 5,
					name: "حنيفة",
					surname: "عيسى",
					gender: "Female",
					classroomDepartmentId: "primary-1-primary-1",
					action: "import_new",
				},
				{
					lineNumber: 6,
					name: "حليمة",
					surname: "عثمان",
					gender: "Female",
					classroomDepartmentId: "primary-1-primary-1",
					action: "import_new",
				},
			],
		});

		expect(result).toMatchObject({
			createdStudents: 5,
			termSheetsCreated: 5,
			failedRows: 0,
		});
		expect(result.rows.map((row) => row.status)).toEqual([
			"created",
			"created",
			"created",
			"created",
			"created",
		]);
		expect(
			createdStudents.map((student: any) => ({
				name: student.name,
				surname: student.surname,
				gender: student.gender,
			})),
		).toEqual([
			{
				name: "بلقيس",
				surname: "أحمد",
				gender: "Female",
			},
			{
				name: "بلقيس",
				surname: "أونيكون",
				gender: "Female",
			},
			{
				name: "بلقيس",
				surname: "إبراهيم",
				gender: "Female",
			},
			{
				name: "حنيفة",
				surname: "عيسى",
				gender: "Female",
			},
			{
				name: "حليمة",
				surname: "عثمان",
				gender: "Female",
			},
		]);
		expect(
			createdSessionForms.map((form: any) => form.classroomDepartmentId),
		).toEqual(Array(5).fill("primary-1-primary-1"));
		expect(
			createdTermForms.map((form: any) => form.classroomDepartmentId),
		).toEqual(Array(5).fill("primary-1-primary-1"));
	});
});

// Jobs share the import store; the job tables start empty.
const createImportJobCtx = createImportCtx;

describe("student import jobs", () => {
	test("creates a pending tenant-scoped import job with persisted row payloads", async () => {
		const { ctx, jobs, jobRows } = createImportJobCtx();

		const job = await startStudentImportJob(
			ctx,
			{
				rows: [
					{
						lineNumber: 1,
						name: "John",
						surname: "Doe",
						gender: "Male",
						classroomDepartmentId: "classroom-a",
						action: "keep_match",
						existingStudentId: "student-1",
					},
					{
						lineNumber: 2,
						name: "Mary",
						surname: "Major",
						gender: "Female",
						classroomDepartmentId: "classroom-b",
						action: "keep_match",
						existingStudentId: "student-2",
					},
				],
			},
			{ enqueue: false },
		);

		expect(job).toMatchObject({
			id: "job-1",
			status: "PENDING",
			totalRows: 2,
			processedRows: 0,
			createdStudents: 0,
			failedRows: 0,
		});
		expect(jobs[0]).toMatchObject({
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
		});
		expect(jobRows.map((row) => row.lineNumber)).toEqual([1, 2]);
		expect(jobRows[0]?.payload).toMatchObject({
			action: "keep_match",
			existingStudentId: "student-1",
		});
	});

	test("persists the effective classroom fallback on job rows", async () => {
		const { ctx, jobRows } = createImportJobCtx();

		await startStudentImportJob(
			ctx,
			{
				classroomDepartmentId: "classroom-a",
				rows: [
					{
						lineNumber: 1,
						name: "John",
						surname: "Doe",
						gender: "Male",
						action: "keep_match",
						existingStudentId: "student-1",
					},
				],
			},
			{ enqueue: false },
		);

		expect(jobRows[0]?.payload).toMatchObject({
			classroomDepartmentId: "classroom-a",
		});
	});

	test("reads only tenant-owned import jobs", async () => {
		const { ctx, jobs } = createImportJobCtx();
		jobs.push({
			id: "job-foreign",
			status: "COMPLETED",
			totalRows: 1,
			processedRows: 1,
			createdStudents: 1,
			keptMatches: 0,
			updatedMatches: 0,
			termSheetsCreated: 1,
			skippedRows: 0,
			failedRows: 0,
			schoolProfileId: "other-school",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			deletedAt: null,
		});

		await expect(
			getStudentImportJob(ctx, { jobId: "job-foreign" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<TRPCError>);
	});

	test("returns null when no recoverable import job exists", async () => {
		const { ctx } = createImportJobCtx();

		await expect(getStudentImportJob(ctx)).resolves.toBeNull();
	});

	test("reports only settled rows while a job is still running", async () => {
		const { ctx, jobs, jobRows } = createImportJobCtx();
		jobs.push({
			id: "job-running",
			status: "RUNNING",
			totalRows: 2,
			processedRows: 1,
			createdStudents: 1,
			keptMatches: 0,
			updatedMatches: 0,
			termSheetsCreated: 1,
			skippedRows: 0,
			failedRows: 0,
			triggerRunId: null,
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			deletedAt: null,
		});
		jobRows.push(
			{ id: "row-1", jobId: "job-running", lineNumber: 1, action: "import_new", status: "CREATED", studentId: "student-new", termSheetCreated: true, reason: null, deletedAt: null },
			{ id: "row-2", jobId: "job-running", lineNumber: 2, action: "import_new", status: "PENDING", studentId: null, termSheetCreated: false, reason: null, deletedAt: null },
		);

		const job = await getStudentImportJob(ctx, { jobId: "job-running" });

		expect(job?.rows).toEqual([
			expect.objectContaining({ lineNumber: 1, status: "created" }),
		]);
	});

	test("processes only pending rows and does not double-count completed rows", async () => {
		const { ctx, jobs, jobRows, createdTermForms } = createImportJobCtx();
		jobs.push({
			id: "job-1",
			status: "RUNNING",
			totalRows: 2,
			processedRows: 1,
			createdStudents: 0,
			keptMatches: 1,
			updatedMatches: 0,
			termSheetsCreated: 1,
			skippedRows: 0,
			failedRows: 0,
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			deletedAt: null,
		});
		jobRows.push(
			{
				id: "job-row-1",
				jobId: "job-1",
				lineNumber: 1,
				action: "keep_match",
				status: "KEPT",
				studentId: "student-1",
				termSheetCreated: true,
				reason: null,
				completedAt: new Date("2026-07-14T09:00:00.000Z"),
				payload: {
					lineNumber: 1,
					name: "John",
					surname: "Doe",
					gender: "Male",
					classroomDepartmentId: "classroom-a",
					action: "keep_match",
					existingStudentId: "student-1",
				},
			},
			{
				id: "job-row-2",
				jobId: "job-1",
				lineNumber: 2,
				action: "keep_match",
				status: "PENDING",
				studentId: null,
				termSheetCreated: false,
				reason: null,
				completedAt: null,
				payload: {
					lineNumber: 2,
					name: "Mary",
					surname: "Major",
					gender: "Female",
					classroomDepartmentId: "classroom-b",
					action: "keep_match",
					existingStudentId: "student-2",
				},
			},
		);

		const result = await processStudentImportJob(ctx.db, "job-1");

		expect(result).toMatchObject({
			status: "COMPLETED",
			processedRows: 2,
			keptMatches: 2,
			termSheetsCreated: 2,
			failedRows: 0,
		});
		expect(createdTermForms).toHaveLength(1);
		expect(jobRows.map((row) => row.status)).toEqual(["KEPT", "KEPT"]);
	});

	test("persists aggregate progress after each bounded chunk", async () => {
		const { ctx, jobs, jobRows, jobUpdates } = createImportJobCtx();
		jobs.push({
			id: "job-1",
			status: "PENDING",
			totalRows: 26,
			processedRows: 0,
			createdStudents: 0,
			keptMatches: 0,
			updatedMatches: 0,
			termSheetsCreated: 0,
			skippedRows: 0,
			failedRows: 0,
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			deletedAt: null,
		});

		for (let lineNumber = 1; lineNumber <= 26; lineNumber += 1) {
			jobRows.push({
				id: `job-row-${lineNumber}`,
				jobId: "job-1",
				lineNumber,
				action: "keep_match",
				status: "PENDING",
				studentId: null,
				termSheetCreated: false,
				reason: null,
				completedAt: null,
				payload: {
					lineNumber,
					name: "Mary",
					surname: "Major",
					gender: "Female",
					classroomDepartmentId: "classroom-b",
					action: "keep_match",
					existingStudentId: "student-2",
				},
			});
		}

		const result = await processStudentImportJob(ctx.db, "job-1");
		const progressUpdates = jobUpdates
			.map((update) => update.data)
			.filter((data) => typeof data.processedRows === "number");

		expect(progressUpdates[0]).toMatchObject({
			status: "RUNNING",
			processedRows: 25,
			keptMatches: 25,
		});
		expect(progressUpdates.at(-1)).toMatchObject({
			status: "COMPLETED",
			processedRows: 26,
			keptMatches: 26,
		});
		expect(result).toMatchObject({
			status: "COMPLETED",
			processedRows: 26,
			keptMatches: 26,
			failedRows: 0,
		});
	});
});

function createDuplicateCtx({
	firstAssessmentCount = 0,
	secondAssessmentCount = 0,
	assessmentRecords = [],
}: {
	firstAssessmentCount?: number;
	secondAssessmentCount?: number;
	assessmentRecords?: Array<{
		id: number;
		classSubjectAssessmentId: number | null;
		studentId: string | null;
		studentTermFormId: string | null;
	}>;
} = {}) {
	const termForms = [
		{
			id: "term-form-history",
			studentSessionFormId: "session-form-history",
			classroomDepartmentId: "classroom-a",
			sessionTermId: "term-1",
			createdAt: new Date("2025-01-01"),
			classroomDepartment: {
				id: "classroom-a",
				departmentName: "A",
				classRoom: { name: "JSS 1" },
			},
			_count: {
				assessmentRecords: firstAssessmentCount,
				attendanceList: 3,
				financeCharges: 2,
			},
			student: {
				id: "student-history",
				name: "Aisha",
				surname: "Bello",
				otherName: null,
				gender: "Female",
				createdAt: new Date("2024-01-01"),
				_count: {
					sessionForms: 2,
					termForms: 4,
					guardians: 1,
					assessmentRecords: 5,
					financeCharges: 3,
					financePayments: 2,
				},
			},
		},
		{
			id: "term-form-current",
			studentSessionFormId: "session-form-current",
			classroomDepartmentId: "classroom-a",
			sessionTermId: "term-1",
			createdAt: new Date("2026-01-01"),
			classroomDepartment: {
				id: "classroom-a",
				departmentName: "A",
				classRoom: { name: "JSS 1" },
			},
			_count: {
				assessmentRecords: secondAssessmentCount,
				attendanceList: 0,
				financeCharges: 0,
			},
			student: {
				id: "student-current",
				name: "  Aisha ",
				surname: "Bello",
				otherName: null,
				gender: "Female",
				createdAt: new Date("2026-01-01"),
				_count: {
					sessionForms: 1,
					termForms: 1,
					guardians: 0,
					assessmentRecords: 0,
					financeCharges: 0,
					financePayments: 0,
				},
			},
		},
		{
			id: "term-form-other-name",
			studentSessionFormId: "session-form-other-name",
			classroomDepartmentId: "classroom-a",
			sessionTermId: "term-1",
			createdAt: new Date("2026-01-02"),
			classroomDepartment: {
				id: "classroom-a",
				departmentName: "A",
				classRoom: { name: "JSS 1" },
			},
			_count: {
				assessmentRecords: 0,
				attendanceList: 0,
				financeCharges: 0,
			},
			student: {
				id: "student-other-name",
				name: "Aisha",
				surname: "Bello",
				otherName: "Khadijah",
				gender: "Female",
				createdAt: new Date("2026-01-02"),
				_count: {
					sessionForms: 1,
					termForms: 1,
					guardians: 0,
					assessmentRecords: 0,
					financeCharges: 0,
					financePayments: 0,
				},
			},
		},
	];

	return {
		profile: {
			schoolId: "school-1",
			sessionId: "session-1",
			termId: "term-1",
		},
		currentUser: {
			id: "user-1",
			role: "Admin",
		},
		db: {
			studentTermForm: {
				findMany: async ({ where }: any) => {
					const studentIds = where.studentId?.in as string[] | undefined;
					return termForms.filter(
						(termForm) =>
							(!where.classroomDepartmentId ||
								termForm.classroomDepartmentId ===
									where.classroomDepartmentId) &&
							termForm.sessionTermId === where.sessionTermId &&
							(!studentIds || studentIds.includes(termForm.student.id)),
					);
				},
			},
			studentAssessmentRecord: {
				findMany: async () => assessmentRecords,
			},
		},
	} as any;
}

describe("student duplicate detection", () => {
	test("groups exact normalized full names within the same class and term", async () => {
		const ctx = createDuplicateCtx();

		const result = await getStudentDuplicateGroups(ctx, {
			classroomDepartmentId: "classroom-a",
		});

		expect(result).toMatchObject({
			duplicateGroupCount: 1,
			duplicateStudentCount: 2,
		});
		expect(result.groups[0]?.members.map((member) => member.studentId)).toEqual(
			["student-history", "student-current"],
		);
		expect(result.groups[0]?.recommendedSurvivorId).toBe("student-history");
	});

	test("preview blocks merge when multiple current copies have assessment records", async () => {
		const ctx = createDuplicateCtx({
			firstAssessmentCount: 1,
			secondAssessmentCount: 1,
		});

		const preview = await previewStudentDuplicateMerge(ctx, {
			classroomDepartmentId: "classroom-a",
			survivorStudentId: "student-history",
			duplicateStudentIds: ["student-current"],
		});

		expect(preview.canMerge).toBe(false);
		expect(preview.conflicts).toContain(
			"Multiple duplicate copies have current-term assessment records. Review scores before merging.",
		);
	});

	test("preview allows moving a single current copy into the history survivor", async () => {
		const ctx = createDuplicateCtx({
			firstAssessmentCount: 0,
			secondAssessmentCount: 1,
		});

		const preview = await previewStudentDuplicateMerge(ctx, {
			classroomDepartmentId: "classroom-a",
			survivorStudentId: "student-history",
			duplicateStudentIds: ["student-current"],
		});

		expect(preview.canMerge).toBe(true);
		expect(preview.conflicts).toEqual([]);
		expect(preview.recordsToMove.assessmentRecords).toBe(1);
	});

	test("preview blocks assessment unique-key collisions before merge", async () => {
		const ctx = createDuplicateCtx({
			assessmentRecords: [
				{
					id: 1,
					classSubjectAssessmentId: 100,
					studentId: "student-history",
					studentTermFormId: "term-form-history",
				},
				{
					id: 2,
					classSubjectAssessmentId: 100,
					studentId: "student-current",
					studentTermFormId: "term-form-current",
				},
			],
		});

		const preview = await previewStudentDuplicateMerge(ctx, {
			classroomDepartmentId: "classroom-a",
			survivorStudentId: "student-history",
			duplicateStudentIds: ["student-current"],
		});

		expect(preview.canMerge).toBe(false);
		expect(preview.conflicts).toContain(
			"The survivor and duplicate copy both have a record for the same assessment. Review scores before merging.",
		);
	});
});

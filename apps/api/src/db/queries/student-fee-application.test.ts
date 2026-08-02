import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const {
	applicableStudentGenderAudiences,
	isFinanceItemApplicableToStudentTerm,
	reconcileFeeHistoriesForStudentTermForm,
} = await import("./student-fee-application");

test("unknown gender only permits all-gender fees", () => {
	expect(applicableStudentGenderAudiences(null)).toEqual(["ALL_GENDERS"]);
});

const term = {
	admissionType: "NEW_ADMISSION" as const,
	studentGender: "Female" as const,
	classroomDepartmentId: "classroom-1",
	schoolSessionId: "session-1",
	sessionTermId: "term-1",
};

describe("isFinanceItemApplicableToStudentTerm", () => {
	test("keeps required and optional fee selection separate from admission audience", () => {
		const entranceFee = {
			id: "entrance-fee",
			collectable: true,
			isActive: true,
			studentAudience: "NEW_ADMISSIONS_ONLY" as const,
			studentGenderAudience: "ALL_GENDERS" as const,
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			applicableClassroomDepartmentIds: ["classroom-1"],
		};

		expect(
			isFinanceItemApplicableToStudentTerm(entranceFee, term, {
				selectedOptionalFeeItemIds: [],
			}),
		).toBe(true);

		expect(
			isFinanceItemApplicableToStudentTerm(
				{ ...entranceFee, collectable: false },
				term,
				{ selectedOptionalFeeItemIds: [] },
			),
		).toBe(false);

		expect(
			isFinanceItemApplicableToStudentTerm(
				{ ...entranceFee, collectable: false },
				term,
				{ selectedOptionalFeeItemIds: ["entrance-fee"] },
			),
		).toBe(true);
	});

	test("does not apply a new-admission fee to a returning student", () => {
		expect(
			isFinanceItemApplicableToStudentTerm(
				{
					id: "entrance-fee",
					collectable: true,
					isActive: true,
					studentAudience: "NEW_ADMISSIONS_ONLY",
					studentGenderAudience: "ALL_GENDERS",
					schoolSessionId: null,
					sessionTermId: null,
					applicableClassroomDepartmentIds: [],
				},
				{ ...term, admissionType: "RETURNING" },
			),
		).toBe(false);
	});

	test("honours term and classroom scope while allowing school-wide items", () => {
		const base = {
			id: "tuition",
			collectable: true,
			isActive: true,
			studentAudience: "ALL_STUDENTS" as const,
			studentGenderAudience: "ALL_GENDERS" as const,
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
		};

		expect(
			isFinanceItemApplicableToStudentTerm(
				{ ...base, applicableClassroomDepartmentIds: [] },
				term,
			),
		).toBe(true);
		expect(
			isFinanceItemApplicableToStudentTerm(
				{
					...base,
					applicableClassroomDepartmentIds: ["classroom-2"],
				},
				term,
			),
		).toBe(false);
		expect(
			isFinanceItemApplicableToStudentTerm(
				{
					...base,
					sessionTermId: "term-2",
					applicableClassroomDepartmentIds: [],
				},
				term,
			),
		).toBe(false);
	});

	test("intersects gender and admission audience", () => {
		const femaleNewAdmissionFee = {
			id: "female-uniform",
			collectable: true,
			isActive: true,
			studentAudience: "NEW_ADMISSIONS_ONLY" as const,
			studentGenderAudience: "FEMALE_ONLY" as const,
			schoolSessionId: null,
			sessionTermId: null,
			applicableClassroomDepartmentIds: [],
		};

		expect(
			isFinanceItemApplicableToStudentTerm(femaleNewAdmissionFee, term),
		).toBe(true);
		expect(
			isFinanceItemApplicableToStudentTerm(femaleNewAdmissionFee, {
				...term,
				studentGender: "Male",
			}),
		).toBe(false);
		expect(
			isFinanceItemApplicableToStudentTerm(femaleNewAdmissionFee, {
				...term,
				admissionType: "RETURNING",
			}),
		).toBe(false);
	});
});

describe("reconcileFeeHistoriesForStudentTermForm", () => {
	test("creates newly applicable charges and preserves paid stale charges", async () => {
		const createdItemIds: string[] = [];
		const cancelledIds: string[] = [];
		const db = {
			financeItem: {
				findMany: async () => [
					{
						id: "female-uniform",
						name: "Female uniform",
						description: null,
						amount: 12_000,
						collectable: true,
						isActive: true,
						studentAudience: "ALL_STUDENTS",
						studentGenderAudience: "FEMALE_ONLY",
						schoolSessionId: "session-1",
						sessionTermId: "term-1",
						streamId: "stream-1",
						stream: { id: "stream-1" },
						applicableClasses: [],
					},
				],
			},
			financeCharge: {
				findMany: async () => [
					{
						id: "paid-male-uniform",
						itemId: "male-uniform",
						amountPaid: 12_000,
						assignmentSource: "REQUIRED_AUTO",
					},
				],
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createdItemIds.push(String(data.itemId));
					return { id: "new-charge", ...data };
				},
				updateMany: async ({
					where,
				}: {
					where: { id: { in: string[] } };
				}) => {
					cancelledIds.push(...where.id.in);
					return { count: where.id.in.length };
				},
			},
		};

		const result = await reconcileFeeHistoriesForStudentTermForm(db, {
			schoolProfileId: "school-1",
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			classroomDepartmentId: "classroom-1",
			admissionType: "NEW_ADMISSION",
			studentGender: "Female",
		});

		expect(result.applied).toBe(1);
		expect(result.cancelled).toBe(0);
		expect(createdItemIds).toEqual(["female-uniform"]);
		expect(cancelledIds).toEqual([]);
	});

	test("cancels an unpaid managed charge while preserving manual charges", async () => {
		const cancelledIds: string[] = [];
		const db = {
			financeItem: {
				findMany: async () => [
					{
						id: "entrance-fee",
						name: "Entrance form",
						description: null,
						amount: 1_000,
						collectable: false,
						isActive: true,
						studentAudience: "NEW_ADMISSIONS_ONLY",
						studentGenderAudience: "ALL_GENDERS",
						schoolSessionId: "session-1",
						sessionTermId: "term-1",
						streamId: "stream-1",
						stream: { id: "stream-1" },
						applicableClasses: [],
					},
				],
			},
			financeCharge: {
				findMany: async () => [
					{
						id: "charge-1",
						itemId: "entrance-fee",
						amountPaid: 0,
						assignmentSource: "REQUIRED_AUTO",
					},
					{
						id: "charge-manual",
						itemId: "entrance-fee",
						amountPaid: 0,
						assignmentSource: "MANUAL",
					},
				],
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => data,
				updateMany: async ({
					where,
				}: {
					where: { id: { in: string[] } };
				}) => {
					cancelledIds.push(...where.id.in);
					return { count: where.id.in.length };
				},
			},
		};

		const result = await reconcileFeeHistoriesForStudentTermForm(db, {
			schoolProfileId: "school-1",
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			classroomDepartmentId: "classroom-1",
			admissionType: "NEW_ADMISSION",
			studentGender: "Female",
		});

		expect(result.cancelled).toBe(1);
		expect(result.applied).toBe(0);
		expect(cancelledIds).toEqual(["charge-1"]);
	});
});

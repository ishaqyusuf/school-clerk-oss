import { describe, expect, test } from "bun:test";
import {
	processFinancePaymentImportJob,
	retryPaymentImportJob,
	startPaymentImportJob,
	verifyPaymentImport,
} from "./payment-import";

function baseContext(db: Record<string, unknown>) {
	return {
		db,
		profile: {
			schoolId: "school-1",
			sessionId: "session-current",
			termId: "term-current",
			studentNameFormat: "FIRST_SURNAME_OTHER",
		},
		currentUser: {
			id: "user-1",
			name: "Admin User",
			role: "Admin",
		},
	} as any;
}

function verificationDb() {
	return {
		sessionTerm: {
			findFirst: async () => ({
				id: "term-1",
				title: "First Term",
				sessionId: "session-1",
				session: { id: "session-1", title: "2026/2027" },
			}),
		},
		financeStream: {
			findMany: async () => [
				{ id: "fees-stream", name: "School Fees", accountType: "CREDIT" },
				{ id: "wages-stream", name: "Salary/Wages", accountType: "DEBIT" },
			],
		},
		financeItem: {
			findMany: async (): Promise<
				Array<{
					id: string;
					name: string;
					type: "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";
					streamId: string;
					amount: number;
					collectable: boolean;
					applicableClasses: Array<{
						classRoomDepartmentId: string;
					}>;
				}>
			> => [
				{
					id: "tuition-item",
					name: "School Fees",
					type: "TUITION_FEE",
					streamId: "fees-stream",
					amount: 3000,
					collectable: true,
					applicableClasses: [],
				},
			],
		},
		students: {
			findMany: async () => [
				{
					id: "student-1",
					name: "عبد السلام",
					surname: "إسماعيل",
					otherName: null,
					termForms: [
						{
							id: "term-form-1",
							classroomDepartment: {
								departmentName: "A",
								classRoom: { name: "Primary 1" },
							},
						},
					],
				},
			],
		},
		staffProfile: { findMany: async () => [] },
		financePaymentImportJobRow: { findMany: async () => [] },
	};
}

describe("payment import verification", () => {
	test("matches Arabic names and suggests the correct account type", async () => {
		const result = await verifyPaymentImport(baseContext(verificationDb()), {
			mode: "STUDENT",
			termId: "term-1",
			rows: [
				{
					lineNumber: 2,
					paymentDate: "2026-05-09",
					counterpartyName: "عبد السلام اسماعيل",
					paymentType: "SCHOOL_FEE",
					amount: 3000,
					sourceNote: null,
					counterpartyId: null,
					streamId: null,
					itemId: null,
				},
			],
		});

		expect(result.rows[0]?.status).toBe("READY");
		expect(result.rows[0]?.counterpartyId).toBe("student-1");
		expect(result.rows[0]?.studentTermFormId).toBe("term-form-1");
		expect(result.rows[0]?.streamId).toBe("fees-stream");
		expect(result.rows[0]?.itemId).toBe("tuition-item");
		expect(result.summary).toMatchObject({
			totalRows: 1,
			readyRows: 1,
			totalAmount: 3000,
		});
	});

	test("blocks a matched student without a selected-term sheet", async () => {
		const db = verificationDb();
		db.students.findMany = async () => [
			{
				id: "student-1",
				name: "Maryam",
				surname: "Bello",
				otherName: null,
				termForms: [],
			},
		];

		const result = await verifyPaymentImport(baseContext(db), {
			mode: "STUDENT",
			termId: "term-1",
			rows: [
				{
					lineNumber: 2,
					paymentDate: "2026-05-09",
					counterpartyName: "Maryam Bello",
					paymentType: "SCHOOL_FEE",
					amount: 3000,
					sourceNote: null,
					counterpartyId: null,
					streamId: null,
					itemId: null,
				},
			],
		});

		expect(result.rows[0]?.status).toBe("NEEDS_REVIEW");
		expect(result.rows[0]?.blockers).toContain(
			"Student has no term sheet in the selected term.",
		);
	});

	test("requires an explicit decision for identical rows in one file", async () => {
		const row = {
			paymentDate: "2026-05-09",
			counterpartyName: "عبد السلام اسماعيل",
			paymentType: "SCHOOL_FEE" as const,
			amount: 3000,
			sourceNote: null,
			counterpartyId: null,
			streamId: null,
			itemId: null,
		};
		const result = await verifyPaymentImport(baseContext(verificationDb()), {
			mode: "STUDENT",
			termId: "term-1",
			rows: [
				{ ...row, lineNumber: 2 },
				{ ...row, lineNumber: 3, allowDuplicate: true },
			],
		});

		expect(result.rows[0]?.status).toBe("NEEDS_REVIEW");
		expect(result.rows[0]?.duplicate).toBe(true);
		expect(result.rows[1]?.status).toBe("READY");
	});

	test("rejects a finance item outside the selected account scope", async () => {
		const db = verificationDb();
		db.financeItem.findMany = async () => [
			{
				id: "tuition-item",
				name: "School Fees",
				type: "TUITION_FEE",
				streamId: "fees-stream",
				amount: 3000,
				collectable: true,
				applicableClasses: [],
			},
		];

		const result = await verifyPaymentImport(baseContext(db), {
			mode: "STUDENT",
			termId: "term-1",
			rows: [
				{
					lineNumber: 2,
					paymentDate: "2026-05-09",
					counterpartyName: "عبد السلام اسماعيل",
					paymentType: "SCHOOL_FEE",
					amount: 3000,
					sourceNote: null,
					counterpartyId: null,
					streamId: "fees-stream",
					itemId: "foreign-item",
				},
			],
		});

		expect(result.rows[0]?.status).toBe("NEEDS_REVIEW");
		expect(result.rows[0]?.blockers).toContain(
			"Selected finance item is unavailable for this account and term.",
		);
	});
});

describe("payment import jobs", () => {
	test("persists verified rows with global term context", async () => {
		const storedRows: any[] = [];
		let createdJobData: any = null;
		const db = {
			...verificationDb(),
			financePaymentImportJob: {
				create: async ({ data }: any) => {
					createdJobData = data;
					return {
						id: "job-1",
						status: "PENDING",
						processedRows: 0,
						importedRows: 0,
						skippedRows: 0,
						failedRows: 0,
						importedAmount: 0,
						errorMessage: null,
						triggerRunId: null,
						createdAt: new Date(),
						updatedAt: new Date(),
						...data,
					};
				},
				findFirst: async () => ({
					id: "job-1",
					mode: "STUDENT",
					status: "PENDING",
					sessionTermId: "term-1",
					schoolSessionId: "session-1",
					method: "Transfer",
					sourceFileName: "payments.csv",
					totalRows: 1,
					processedRows: 0,
					importedRows: 0,
					skippedRows: 0,
					failedRows: 0,
					totalAmount: 3000,
					importedAmount: 0,
					errorMessage: null,
					triggerRunId: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			},
			financePaymentImportJobRow: {
				createMany: async ({ data }: any) => {
					storedRows.push(...data);
					return { count: data.length };
				},
				findMany: async () =>
					storedRows.map((row, index) => ({
						id: `row-${index + 1}`,
						chargeId: null,
						paymentId: null,
						reason: null,
						...row,
					})),
			},
			activity: { create: async () => ({ id: "activity-1" }) },
		};

		const job = await startPaymentImportJob(
			baseContext(db),
			{
				mode: "STUDENT",
				termId: "term-1",
				method: "Transfer",
				sourceFileName: "payments.csv",
				rows: [
					{
						lineNumber: 2,
						paymentDate: "2026-05-09",
						counterpartyName: "عبد السلام اسماعيل",
						paymentType: "SCHOOL_FEE",
						amount: 3000,
						sourceNote: null,
						counterpartyId: "student-1",
						streamId: "fees-stream",
						itemId: null,
					},
					{
						lineNumber: 3,
						paymentDate: null,
						counterpartyName: "Skip Me",
						paymentType: "SCHOOL_FEE",
						amount: 500,
						sourceNote: "Not part of this batch",
						counterpartyId: null,
						streamId: null,
						itemId: null,
						skip: true,
					},
				],
			},
			{ enqueue: false },
		);

		expect(job?.id).toBe("job-1");
		expect(storedRows).toHaveLength(2);
		expect(storedRows[0]).toMatchObject({
			jobId: "job-1",
			lineNumber: 2,
			counterpartyId: "student-1",
			studentTermFormId: "term-form-1",
			streamId: "fees-stream",
			itemId: "tuition-item",
		});
		expect(storedRows[1]).toMatchObject({
			lineNumber: 3,
			status: "SKIPPED",
		});
		expect(Number(createdJobData.totalAmount)).toBe(3000);
	});

	test("creates canonical charge, payment, allocation, and ledger records", async () => {
		const created: Record<string, any> = {};
		const row = {
			id: "row-1",
			jobId: "job-1",
			lineNumber: 2,
			status: "PENDING",
			deletedAt: null,
			payload: {
				lineNumber: 2,
				paymentDate: "2026-05-09",
				counterpartyName: "عبد السلام إسماعيل",
				paymentType: "SCHOOL_FEE",
				amount: 3000,
				sourceNote: "Historical payment",
				counterpartyId: "student-1",
				studentTermFormId: "term-form-1",
				streamId: "fees-stream",
				itemId: null,
			},
		};
		const job: any = {
			id: "job-1",
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			mode: "STUDENT",
			method: "Transfer",
			totalRows: 1,
			totalAmount: 3000,
			status: "PENDING",
		};
		const tx = {
			$queryRaw: async () => [{ id: "row-1" }],
			financePayment: {
				findFirst: async () => null,
				create: async ({ data }: any) => {
					created.payment = data;
					return { id: "payment-1", paymentDate: data.paymentDate };
				},
			},
			financeTermLedgerClose: { findFirst: async () => null },
			financeStream: {
				findFirst: async () => ({
					id: "fees-stream",
					accountType: "CREDIT",
				}),
			},
			studentTermForm: {
				findFirst: async () => ({
					id: "term-form-1",
					classroomDepartmentId: "class-1",
				}),
			},
			staffProfile: { findFirst: async () => null },
			financeCharge: {
				create: async ({ data }: any) => {
					created.charge = data;
					return { id: "charge-1" };
				},
			},
			financePaymentAllocation: {
				create: async ({ data }: any) => {
					created.allocation = data;
					return { id: "allocation-1" };
				},
			},
			financeLedgerEntry: {
				create: async ({ data }: any) => {
					created.ledger = data;
					return { id: "ledger-1" };
				},
			},
		};
		const db: any = {
			financePaymentImportJob: {
				findFirst: async () => job,
				update: async ({ data }: any) => Object.assign(job, data),
			},
			financePaymentImportJobRow: {
				findMany: async () => [row],
				update: async ({ data }: any) => Object.assign(row, data),
			},
			activity: { create: async () => ({ id: "activity-1" }) },
			$transaction: async (callback: any) => callback(tx),
		};

		const result = await processFinancePaymentImportJob(db, "job-1");

		expect(result.status).toBe("COMPLETED");
		expect(result.importedRows).toBe(1);
		expect(created.charge).toMatchObject({
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			status: "PAID",
		});
		expect(Number(created.charge.amount)).toBe(3000);
		expect(Number(created.charge.amountPaid)).toBe(3000);
		expect(created.payment).toMatchObject({
			studentId: "student-1",
			streamId: "fees-stream",
			reference: "payment-import:row-1",
		});
		expect(created.allocation).toMatchObject({
			paymentId: "payment-1",
			chargeId: "charge-1",
		});
		expect(created.ledger).toMatchObject({
			paymentId: "payment-1",
			chargeId: "charge-1",
			direction: "CREDIT",
		});
	});

	test("applies separate partial rows to one configured student charge", async () => {
		const job: any = {
			id: "job-1",
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			mode: "STUDENT",
			method: "Transfer",
			totalRows: 2,
			totalAmount: 3000,
			status: "PENDING",
		};
		const rows: any[] = [2000, 1000].map((amount, index) => ({
			id: `row-${index + 1}`,
			jobId: "job-1",
			lineNumber: index + 2,
			status: "PENDING",
			deletedAt: null,
			payload: {
				lineNumber: index + 2,
				paymentDate: "2026-06-13",
				counterpartyName: "عبد الملك عبد الكبير",
				paymentType: "SCHOOL_FEE",
				amount,
				sourceNote: `Part ${index + 1}`,
				counterpartyId: "student-1",
				studentTermFormId: "term-form-1",
				streamId: "fees-stream",
				itemId: "tuition-item",
			},
		}));
		let charge: any = null;
		let paymentCount = 0;
		const allocations: any[] = [];
		const tx = {
			$queryRaw: async () => [{ id: "row-1" }],
			financePayment: {
				findFirst: async () => null,
				create: async ({ data }: any) => {
					paymentCount += 1;
					return {
						id: `payment-${paymentCount}`,
						paymentDate: data.paymentDate,
					};
				},
			},
			financeTermLedgerClose: { findFirst: async () => null },
			financeStream: {
				findFirst: async () => ({
					id: "fees-stream",
					accountType: "CREDIT",
				}),
			},
			studentTermForm: {
				findFirst: async () => ({
					id: "term-form-1",
					classroomDepartmentId: "class-1",
				}),
			},
			staffProfile: { findFirst: async () => null },
			financeItem: {
				findFirst: async () => ({
					id: "tuition-item",
					name: "School Fees",
					description: null,
					amount: 3000,
				}),
			},
			financeCharge: {
				findFirst: async () =>
					charge?.status === "PARTIALLY_PAID" ? charge : null,
				create: async ({ data }: any) => {
					charge = { id: "charge-1", ...data };
					return charge;
				},
				update: async ({ data }: any) => {
					Object.assign(charge, data);
					return charge;
				},
			},
			financePaymentAllocation: {
				create: async ({ data }: any) => {
					allocations.push(data);
					return { id: `allocation-${allocations.length}` };
				},
			},
			financeLedgerEntry: {
				create: async () => ({ id: `ledger-${paymentCount}` }),
			},
		};
		const db: any = {
			financePaymentImportJob: {
				findFirst: async () => job,
				update: async ({ data }: any) => Object.assign(job, data),
			},
			financePaymentImportJobRow: {
				findMany: async ({ where }: any) =>
					where.status?.in
						? rows.filter((row) => where.status.in.includes(row.status))
						: rows,
				update: async ({ where, data }: any) => {
					const row = rows.find((entry) => entry.id === where.id);
					Object.assign(row, data);
					return row;
				},
			},
			activity: { create: async () => ({ id: "activity-1" }) },
			$transaction: async (callback: any) => callback(tx),
		};

		const result = await processFinancePaymentImportJob(db, "job-1");

		expect(result.status).toBe("COMPLETED");
		expect(result.importedRows).toBe(2);
		expect(paymentCount).toBe(2);
		expect(allocations.map((allocation) => allocation.chargeId)).toEqual([
			"charge-1",
			"charge-1",
		]);
		expect(Number(charge.amount)).toBe(3000);
		expect(Number(charge.amountPaid)).toBe(3000);
		expect(charge.status).toBe("PAID");
	});

	test("resets only failed rows when retrying a partial import", async () => {
		const job: any = {
			id: "job-1",
			schoolProfileId: "school-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			createdByUserId: "user-1",
			mode: "STUDENT",
			method: "Transfer",
			sourceFileName: "payments.csv",
			status: "COMPLETED_WITH_FAILURES",
			totalRows: 2,
			processedRows: 2,
			importedRows: 1,
			skippedRows: 0,
			failedRows: 1,
			totalAmount: 6000,
			importedAmount: 3000,
			errorMessage: null,
			triggerRunId: "run-old",
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const rows: any[] = [
			{
				id: "row-1",
				jobId: "job-1",
				lineNumber: 2,
				status: "IMPORTED",
				payload: { amount: 3000 },
				chargeId: "charge-1",
				paymentId: "payment-1",
			},
			{
				id: "row-2",
				jobId: "job-1",
				lineNumber: 3,
				status: "FAILED",
				payload: { amount: 3000 },
				reason: "Temporary failure",
			},
		];
		const db: any = {
			financePaymentImportJob: {
				findFirst: async () => job,
				update: async ({ data }: any) => Object.assign(job, data),
			},
			financePaymentImportJobRow: {
				findMany: async ({ where }: any) =>
					where.status?.in
						? rows.filter((row) => where.status.in.includes(row.status))
						: rows,
				updateMany: async ({ data }: any) => {
					for (const row of rows) {
						if (row.status === "FAILED") Object.assign(row, data);
					}
					return { count: 1 };
				},
			},
			activity: { create: async () => ({ id: "activity-1" }) },
			$transaction: async (operations: Promise<unknown>[]) =>
				Promise.all(operations),
		};

		const result = await retryPaymentImportJob(
			baseContext(db),
			{ jobId: "job-1" },
			{ enqueue: false },
		);

		expect(result?.status).toBe("PENDING");
		expect(result?.processedRows).toBe(1);
		expect(result?.failedRows).toBe(0);
		expect(rows[1]?.status).toBe("PENDING");
		expect(rows[0]?.status).toBe("IMPORTED");
	});
});

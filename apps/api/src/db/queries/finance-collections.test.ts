import { describe, expect, test } from "bun:test";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const { receiveStudentPaymentBatch, receiveStudentPaymentLines } = await import(
	"./finance-collections"
);

function createCtx(db: Record<string, unknown>, role = "Accountant") {
	return {
		profile: { schoolId: "school-1", termId: "term-2", sessionId: "session-1" },
		currentUser: { id: "user-1", email: "u@example.com", name: "U", role, saasAccountId: null },
		db,
	} as any;
}

/** In-memory charges plus a transaction that rolls back on throw. */
function createDb(charges: Record<string, any>) {
	const committed = { payments: [] as any[], ledger: [] as any[], charges };
	const db = {
		students: { findFirst: async () => ({ id: "student-1" }) },
		$transaction: async (fn: (tx: any) => unknown) => {
			const draft = structuredClone(committed.charges);
			const payments: any[] = [];
			const ledger: any[] = [];
			const tx = {
				financeCharge: {
					findFirst: async ({ where }: any) => {
						const charge = draft[where.id];
						if (!charge) return null;
						if (where.studentId && charge.studentId !== where.studentId) return null;
						return charge;
					},
					update: async ({ where, data }: any) => {
						draft[where.id] = { ...draft[where.id], ...data };
						return draft[where.id];
					},
				},
				financePayment: {
					create: async ({ data }: any) => {
						const payment = { id: `payment-${payments.length + 1}`, ...data };
						payments.push(payment);
						return payment;
					},
				},
				financePaymentAllocation: {
					create: async ({ data }: any) => ({ id: "allocation", ...data }),
				},
				financeLedgerEntry: {
					create: async ({ data }: any) => {
						ledger.push(data);
						return data;
					},
				},
				schoolInventory: { findFirst: async () => null },
				inventoryIssuance: { create: async () => undefined },
			};
			const result = await fn(tx);
			committed.charges = draft;
			committed.payments.push(...payments);
			committed.ledger.push(...ledger);
			return result;
		},
	};
	return { db, committed };
}

function charge(id: string, amount: number, amountPaid = 0, studentId = "student-1") {
	return {
		id,
		schoolProfileId: "school-1",
		streamId: "stream-fees",
		payerType: "STUDENT",
		studentId,
		staffProfileId: null,
		title: id,
		amount,
		amountPaid,
		status: amountPaid ? "PARTIALLY_PAID" : "PENDING",
		collectionStatus: "NOT_REQUIRED",
		sessionTermId: "term-2",
		schoolSessionId: "session-1",
		stream: { id: "stream-fees", accountType: "CREDIT" },
	};
}

describe("receiveStudentPaymentLines", () => {
	test("posts every fee line of one receipt together", async () => {
		const { db, committed } = createDb({
			arrears: charge("arrears", 85_000, 70_000),
			fees: charge("fees", 85_000, 30_000),
		});

		const result = await receiveStudentPaymentLines(createCtx(db), {
			studentId: "student-1",
			lines: [
				{ chargeId: "arrears", amount: 15_000 },
				{ chargeId: "fees", amount: 45_000 },
			],
			otherLines: [],
			method: "Cash",
		});

		expect(result).toMatchObject({ count: 2, totalAllocated: 60_000 });
		expect(committed.payments).toHaveLength(2);
		expect(committed.charges.arrears.status).toBe("PAID");
		expect(committed.charges.fees.status).toBe("PARTIALLY_PAID");
		expect(committed.payments[0]).toMatchObject({
			method: "Cash",
			collectedSessionTermId: "term-2",
		});
	});

	test("rolls back the whole receipt when one line is invalid", async () => {
		const { db, committed } = createDb({
			arrears: charge("arrears", 85_000, 70_000),
			fees: charge("fees", 85_000, 30_000),
		});

		await expect(
			receiveStudentPaymentLines(createCtx(db), {
				studentId: "student-1",
				lines: [
					{ chargeId: "arrears", amount: 15_000 },
					{ chargeId: "fees", amount: 90_000 },
				],
				otherLines: [],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(committed.payments).toHaveLength(0);
		expect(committed.charges.arrears.amountPaid).toBe(70_000);
	});

	test("refuses a fee that belongs to another student", async () => {
		const { db } = createDb({ other: charge("other", 10_000, 0, "student-2") });

		await expect(
			receiveStudentPaymentLines(createCtx(db), {
				studentId: "student-1",
				lines: [{ chargeId: "other", amount: 5_000 }],
				otherLines: [],
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("refuses the same fee twice", async () => {
		const { db } = createDb({ fees: charge("fees", 85_000) });

		await expect(
			receiveStudentPaymentLines(createCtx(db), {
				studentId: "student-1",
				lines: [
					{ chargeId: "fees", amount: 10_000 },
					{ chargeId: "fees", amount: 10_000 },
				],
				otherLines: [],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("rejects writes from non-finance roles", async () => {
		const { db } = createDb({ fees: charge("fees", 85_000) });

		await expect(
			receiveStudentPaymentLines(createCtx(db, "Teacher"), {
				studentId: "student-1",
				lines: [{ chargeId: "fees", amount: 10_000 }],
				otherLines: [],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});

describe("receiveStudentPaymentBatch", () => {
	test("posts good rows and reports failed ones without blocking them", async () => {
		const { db, committed } = createDb({
			a: charge("a", 85_000),
			b: charge("b", 85_000, 85_000),
		});

		const result = await receiveStudentPaymentBatch(createCtx(db), {
			rows: [
				{ studentId: "student-1", chargeId: "a", amount: 85_000 },
				{ studentId: "student-1", chargeId: "b", amount: 5_000 },
			],
			method: "Cash",
		});

		expect(result).toMatchObject({ postedCount: 1, failedCount: 1, totalPosted: 85_000 });
		expect(result.results[1]).toMatchObject({ ok: false, chargeId: "b" });
		expect(committed.charges.a.status).toBe("PAID");
	});
});

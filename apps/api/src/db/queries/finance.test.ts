import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.POSTGRES_URL ??= process.env.DATABASE_URL;

const { getFinanceTermLedger, getReceivePaymentOptions } = await import(
	"./finance"
);

function createFinanceCtx({
	role = "Admin",
	schoolId = "school-1",
	termId = "term-1",
	sessionId = "session-1",
	db,
}: {
	role?: string | null;
	schoolId?: string | undefined;
	termId?: string | undefined;
	sessionId?: string | undefined;
	db: Record<string, unknown>;
}) {
	return {
		profile: { schoolId, termId, sessionId },
		currentUser: role
			? {
					id: "user-1",
					email: "user@example.com",
					name: "User",
					role,
					saasAccountId: null,
				}
			: undefined,
		db,
	} as any;
}

describe("getReceivePaymentOptions", () => {
	test("returns configured payment types, outstanding charges, and permission flags", async () => {
		const financeItemCalls: any[] = [];
		const termForm = {
			id: "term-form-1",
			studentId: "student-1",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
			classroomDepartmentId: "dept-1",
		};
		const configuredItems = [
			{
				id: "item-tuition",
				streamId: "stream-fees",
				type: "TUITION_FEE",
				name: "Tuition",
				description: "Current term tuition",
				amount: 1000,
				collectable: true,
				isActive: true,
				schoolSessionId: "session-1",
				sessionTermId: "term-1",
				stream: {
					id: "stream-fees",
					name: "School Fees",
					accountType: "CREDIT",
				},
				applicableClasses: [],
			},
			{
				id: "item-book",
				streamId: "stream-books",
				type: "BOOK",
				name: "English Book",
				description: "Primary English book",
				amount: 250,
				collectable: true,
				isActive: true,
				schoolSessionId: "session-1",
				sessionTermId: "term-1",
				stream: {
					id: "stream-books",
					name: "Books",
					accountType: "CREDIT",
				},
				applicableClasses: [
					{
						classRoomDepartment: {
							id: "dept-1",
							departmentName: "A",
							classRoom: { id: "class-1", name: "Primary 3" },
						},
					},
				],
			},
		];
		const outstandingCharges = [
			{
				id: "charge-pta",
				streamId: "stream-pta",
				itemId: "item-pta-old",
				title: "PTA Levy",
				description: "Previous term PTA",
				amount: 500,
				amountPaid: 150,
				sessionTermId: "term-0",
				schoolSessionId: "session-0",
				stream: { id: "stream-pta", name: "PTA", accountType: "CREDIT" },
				item: {
					id: "item-pta-old",
					type: "OTHER",
					name: "PTA Levy",
					isActive: false,
				},
				studentTermForm: {
					id: "old-term-form",
					sessionTermId: "term-0",
					schoolSessionId: "session-0",
					sessionTerm: {
						id: "term-0",
						title: "First Term",
						session: { id: "session-0", title: "2025/2026" },
					},
					classroomDepartment: {
						id: "dept-1",
						departmentName: "A",
						classRoom: { id: "class-1", name: "Primary 3" },
					},
				},
			},
		];

		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					$executeRaw: async () => undefined,
					studentTermForm: {
						findFirst: async () => termForm,
					},
					financeItem: {
						findMany: async () => [],
					},
					financeCharge: {
						findMany: async () => [],
					},
				}),
			students: {
				findFirst: async () => ({
					id: "student-1",
					name: "Aisha",
					surname: "Bello",
					otherName: null,
					termForms: [
						{
							id: "term-form-1",
							sessionTermId: "term-1",
							schoolSessionId: "session-1",
							classroomDepartmentId: "dept-1",
							classroomDepartment: {
								id: "dept-1",
								departmentName: "A",
								classRoom: { id: "class-1", name: "Primary 3" },
							},
							sessionTerm: {
								id: "term-1",
								title: "Second Term",
								session: { id: "session-1", title: "2026/2027" },
							},
						},
					],
				}),
			},
			financeItem: {
				findMany: async (args: any) => {
					financeItemCalls.push(args);
					return configuredItems;
				},
			},
			financeCharge: {
				findMany: async () => outstandingCharges,
			},
		};

		const result = await getReceivePaymentOptions(
			createFinanceCtx({ db }),
			{ studentId: "student-1" } as any,
		);

		expect(result.student).toMatchObject({
			id: "student-1",
			name: "Bello Aisha",
			currentClassroom: "Primary 3 A",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
		});
		expect(financeItemCalls[0].where).toMatchObject({
			schoolProfileId: "school-1",
			isActive: true,
			collectable: true,
		});
		expect(result.paymentTypes.map((option) => option.title)).toEqual([
			"PTA",
			"Books",
			"School Fees",
		]);
		expect(result.paymentTypes[0]).toMatchObject({
			streamId: "stream-pta",
			hasOutstanding: true,
			defaultAmount: 350,
		});
		expect(result.paymentTypes[0]?.descriptions[0]).toMatchObject({
			source: "outstandingCharge",
			chargeId: "charge-pta",
			amountDue: 350,
			termLabel: "First Term",
			isActive: false,
		});
		expect(result.permissions).toEqual({
			canReceivePayment: true,
			canCreateSimpleCollection: true,
			canCreateSchoolFee: true,
			canCreateReusableDescription: true,
			canCreateOneOffManualCharge: true,
		});
	});

	test("rejects non-finance roles", async () => {
		await expect(
			getReceivePaymentOptions(
				createFinanceCtx({ role: "Teacher", db: {} }),
				{ studentId: "student-1" } as any,
			),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
	});
});

describe("getFinanceTermLedger", () => {
	test("returns a derived term ledger with account summaries", async () => {
		const financeStreamCalls: any[] = [];
		const db = {
			sessionTerm: {
				findFirst: async (args: any) => {
					expect(args.where).toMatchObject({
						id: "term-1",
						schoolId: "school-1",
					});
					return {
						id: "term-1",
						title: "Second Term",
						startDate: new Date("2026-01-01"),
						endDate: new Date("2026-04-01"),
						sessionId: "session-1",
						session: { id: "session-1", title: "2026/2027" },
					};
				},
			},
			financeStream: {
				findMany: async (args: any) => {
					financeStreamCalls.push(args);
					return [
						{
							id: "stream-fees",
							name: "School Fees",
							slug: "school-fees",
							accountType: "CREDIT",
							description: null,
							isSystem: true,
							ledgerEntries: [
								{ direction: "CREDIT", amount: 1000 },
								{ direction: "DEBIT", amount: 200 },
							],
							_count: {
								charges: 2,
								payments: 1,
								incomingTransfers: 0,
								outgoingTransfers: 1,
							},
						},
						{
							id: "stream-salary",
							name: "Salary",
							slug: "salary",
							accountType: "DEBIT",
							description: null,
							isSystem: true,
							ledgerEntries: [{ direction: "DEBIT", amount: 300 }],
							_count: {
								charges: 1,
								payments: 1,
								incomingTransfers: 0,
								outgoingTransfers: 0,
							},
						},
					];
				},
			},
		};

		const result = await getFinanceTermLedger(
			createFinanceCtx({ role: "Accountant", db }),
		);

		expect(financeStreamCalls[0].include.ledgerEntries.where).toEqual({
			AND: [
				{ charge: { sessionTermId: "term-1" } },
				{ charge: { schoolSessionId: "session-1" } },
			],
		});
		expect(result).toMatchObject({
			id: "term-ledger:term-1",
			status: "OPEN",
			statusLabel: "Open",
			isCurrent: true,
			summary: {
				moneyIn: 1000,
				moneyOut: 500,
				availableBalance: 500,
				accountCount: 2,
				deficitAccountCount: 1,
				deficitAmount: 300,
			},
			permissions: {
				canView: true,
				canClose: false,
				canReopen: false,
			},
		});
		expect(result.accounts.map((account) => account.name)).toEqual([
			"School Fees",
			"Salary",
		]);
	});
});

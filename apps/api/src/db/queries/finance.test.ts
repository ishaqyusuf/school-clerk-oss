import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.POSTGRES_URL ??= process.env.DATABASE_URL;

const {
	closeFinanceTermLedger,
	cancelFinancePurchase,
	getFinancePayeeHistory,
	getFinanceProjectAccountSummary,
	getFinanceStaffHistory,
	getFinanceTermAccountStatement,
	getFinanceTermLedger,
	getReceivePaymentOptions,
	recordFinancePurchase,
	recordFinancePayment,
	receiveStudentPaymentSimple,
	transferFinanceFunds,
	upsertFinancePayrollStructure,
} = await import("./finance");
const { financeRouter } = await import("../../trpc/routers/finance.routes");

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
			financeCharge: {
				findMany: async () => [
					{
						id: "salary-payable",
						streamId: "stream-salary",
						amount: 800,
						amountPaid: 300,
					},
				],
			},
		};

		const result = await getFinanceTermLedger(
			createFinanceCtx({ role: "Accountant", db }),
		);

		expect(financeStreamCalls[0].include.ledgerEntries.where).toEqual({
			AND: [
				{
					OR: [
						{ collectedSessionTermId: "term-1" },
						{
							collectedSessionTermId: null,
							charge: { sessionTermId: "term-1" },
						},
					],
				},
				{
					OR: [
						{ collectedSchoolSessionId: "session-1" },
						{
							collectedSchoolSessionId: null,
							charge: { schoolSessionId: "session-1" },
						},
					],
				},
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
				outstandingPayables: 500,
				outstandingPayablesCount: 1,
				needsFundingAccountCount: 1,
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
		expect(result.accounts[1]).toMatchObject({
			name: "Salary",
			outstandingPayables: 500,
			outstandingPayablesCount: 1,
			needsFunding: true,
			statusLabel: "Needs Funding",
		});
	});
});

describe("receiveStudentPaymentSimple", () => {
	const termForm = {
		id: "term-form-1",
		studentId: "student-1",
		sessionTermId: "term-1",
		schoolSessionId: "session-1",
		classroomDepartmentId: "dept-1",
	};

	function createPaymentTx({
		charge,
		stream,
		item = null,
		onChargeCreate,
		onStreamCreate,
	}: {
		charge: any;
		stream: any;
		item?: any;
		onChargeCreate?: (data: any) => void;
		onStreamCreate?: (data: any) => void;
	}) {
		let activeCharge = charge;
		return {
			financeItem: {
				findFirst: async () => item,
			},
			financeStream: {
				findFirst: async () => stream,
				create: async ({ data }: any) => {
					onStreamCreate?.(data);
					return { id: "stream-created", ...data };
				},
			},
			financeCharge: {
				findFirst: async () => activeCharge,
				create: async ({ data }: any) => {
					onChargeCreate?.(data);
					activeCharge = {
						id: "charge-created",
						amountPaid: 0,
						status: "PENDING",
						collectionStatus: data.collectionStatus,
						stream: stream ?? { id: data.streamId, accountType: "CREDIT" },
						...data,
					};
					return activeCharge;
				},
				update: async ({ data }: any) => ({ ...activeCharge, ...data }),
			},
			financePayment: {
				create: async ({ data }: any) => ({
					id: "payment-1",
					paymentDate: data.paymentDate,
					...data,
				}),
			},
			financePaymentAllocation: {
				create: async ({ data }: any) => ({ id: "allocation-1", ...data }),
			},
			financeLedgerEntry: {
				create: async ({ data }: any) => ({ id: "ledger-1", ...data }),
			},
			inventory: {
				findFirst: async () => null,
			},
			inventoryIssuance: {
				create: async () => undefined,
			},
		};
	}

	test("records payment against an existing outstanding charge", async () => {
		const ledgerEntries: any[] = [];
		const charge = {
			id: "charge-1",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "Tuition",
			amount: 1000,
			amountPaid: 400,
			status: "PARTIALLY_PAID",
			collectionStatus: "NOT_REQUIRED",
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const tx = createPaymentTx({
			charge,
			stream: charge.stream,
		});
		tx.financeLedgerEntry.create = async ({ data }: any) => {
			ledgerEntries.push(data);
			return { id: "ledger-1", ...data };
		};
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => termForm },
			financeCharge: {
				findFirst: async () => ({
					id: "charge-1",
					amount: 1000,
					amountPaid: 400,
				}),
			},
			$transaction: async (fn: (tx: any) => unknown) => fn(tx),
		};

		const result = await receiveStudentPaymentSimple(createFinanceCtx({ db }), {
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			chargeId: "charge-1",
			itemId: null,
			streamId: null,
			streamName: null,
			description: "Parent paid cash",
			amountPaid: 250,
			method: "cash",
			paymentDate: new Date("2026-02-01"),
			reference: "R-001",
			note: null,
			termId: null,
			sessionId: null,
		} as any);

		expect(result).toMatchObject({
			success: true,
			paymentIds: ["payment-1"],
			totalAllocated: 250,
			chargeStatus: "PARTIALLY_PAID",
		});
		expect(ledgerEntries[0]).toMatchObject({
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			direction: "CREDIT",
			sourceType: "PAYMENT",
			sourceId: "payment-1",
			chargeId: "charge-1",
			paymentId: "payment-1",
		});
		expect(Number(ledgerEntries[0].amount)).toBe(250);
	});

	test("creates a charge from a configured item before recording payment", async () => {
		let createdCharge: any;
		const item = {
			id: "item-book",
			type: "BOOK",
			name: "English Book",
			description: "Primary English book",
			amount: 500,
			streamId: "stream-books",
		};
		const stream = { id: "stream-books", accountType: "CREDIT" };
		const tx = createPaymentTx({
			charge: null,
			stream,
			item,
			onChargeCreate: (data) => {
				createdCharge = data;
			},
		});
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => termForm },
			financeItem: { findFirst: async () => item },
			$transaction: async (fn: (tx: any) => unknown) => fn(tx),
		};

		const result = await receiveStudentPaymentSimple(createFinanceCtx({ db }), {
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			chargeId: null,
			itemId: "item-book",
			streamId: null,
			streamName: null,
			description: null,
			amountPaid: 500,
			method: "pos",
			paymentDate: new Date("2026-02-02"),
			reference: null,
			note: null,
			termId: null,
			sessionId: null,
		} as any);

		expect(createdCharge).toMatchObject({
			schoolProfileId: "school-1",
			streamId: "stream-books",
			itemId: "item-book",
			payerType: "STUDENT",
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			classroomDepartmentId: "dept-1",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			title: "English Book",
			collectionStatus: "NOT_COLLECTED",
		});
		expect(Number(createdCharge.amount)).toBe(500);
		expect(result).toMatchObject({
			success: true,
			paymentIds: ["payment-1"],
			chargeStatus: "PAID",
		});
	});

	test("quick-creates a payment stream for a simple collection", async () => {
		let createdStream: any;
		let createdCharge: any;
		const tx = createPaymentTx({
			charge: null,
			stream: null,
			onStreamCreate: (data) => {
				createdStream = data;
			},
			onChargeCreate: (data) => {
				createdCharge = data;
			},
		});
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => termForm },
			$transaction: async (fn: (tx: any) => unknown) => fn(tx),
		};

		const result = await receiveStudentPaymentSimple(createFinanceCtx({ db }), {
			studentId: "student-1",
			studentTermFormId: "term-form-1",
			chargeId: null,
			itemId: null,
			streamId: null,
			streamName: "Uniform Clothes",
			paymentTypeTitle: "Uniform Clothes",
			descriptionTitle: "Uniform deposit",
			description: "First payment",
			amountDue: 1000,
			amountPaid: 300,
			method: "transfer",
			paymentDate: new Date("2026-02-03"),
			reference: "TRF-1",
			note: null,
			termId: null,
			sessionId: null,
		} as any);

		expect(createdStream).toMatchObject({
			schoolProfileId: "school-1",
			name: "Uniform Clothes",
			slug: "uniform-clothes",
			accountType: "CREDIT",
			isSystem: true,
		});
		expect(createdCharge).toMatchObject({
			streamId: "stream-created",
			title: "Uniform deposit",
			collectionStatus: "NOT_REQUIRED",
		});
		expect(Number(createdCharge.amount)).toBe(1000);
		expect(result).toMatchObject({
			success: true,
			paymentIds: ["payment-1"],
			chargeStatus: "PARTIALLY_PAID",
		});
	});

	test("rejects invalid simple payment submissions", async () => {
		await expect(
			receiveStudentPaymentSimple(
				createFinanceCtx({ role: "Teacher", db: {} }),
				{
					studentId: "student-1",
					amountPaid: 100,
				} as any,
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		await expect(
			receiveStudentPaymentSimple(
				createFinanceCtx({
					db: {
						students: { findFirst: async () => ({ id: "student-1" }) },
						studentTermForm: { findFirst: async () => termForm },
					},
				}),
				{
					studentId: "student-1",
					studentTermFormId: "term-form-1",
					amountDue: 50,
					amountPaid: 100,
				} as any,
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("recordFinancePayment term attribution", () => {
	test("records collected-in term separately from the paid-for charge term", async () => {
		const createdPayments: any[] = [];
		const createdLedgerEntries: any[] = [];
		const charge = {
			id: "charge-last-term",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "First Term Tuition",
			amount: 1000,
			amountPaid: 500,
			status: "PARTIALLY_PAID",
			collectionStatus: "NOT_REQUIRED",
			schoolSessionId: "session-0",
			sessionTermId: "term-0",
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeCharge: {
						findFirst: async () => charge,
						update: async ({ data }: any) => ({ ...charge, ...data }),
					},
					financePayment: {
						create: async ({ data }: any) => {
							createdPayments.push(data);
							return {
								id: "payment-late",
								paymentDate: data.paymentDate,
								...data,
							};
						},
					},
					financePaymentAllocation: {
						create: async ({ data }: any) => ({ id: "allocation-late", ...data }),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-late", ...data };
						},
					},
					inventory: { findFirst: async () => null },
					inventoryIssuance: { create: async () => undefined },
				}),
		};

		const result = await recordFinancePayment(createFinanceCtx({ db }), {
			chargeId: "charge-last-term",
			amount: 500,
			paymentDate: new Date("2026-05-01"),
			method: "cash",
			reference: "LATE-1",
			note: "Late first-term payment",
			receivedById: null,
			collectedTermId: "term-1",
			collectedSessionId: "session-1",
		});

		expect(result).toMatchObject({
			success: true,
			paymentId: "payment-late",
			chargeStatus: "PAID",
		});
		expect(createdPayments[0]).toMatchObject({
			collectedSessionTermId: "term-1",
			collectedSchoolSessionId: "session-1",
			streamId: "stream-fees",
			studentId: "student-1",
		});
		expect(createdLedgerEntries[0]).toMatchObject({
			collectedSessionTermId: "term-1",
			collectedSchoolSessionId: "session-1",
			chargeId: "charge-last-term",
			paymentId: "payment-late",
		});
	});

	test("posts staff or service payable payments as money out", async () => {
		const createdLedgerEntries: any[] = [];
		const charge = {
			id: "charge-salary",
			schoolProfileId: "school-1",
			streamId: "stream-salary",
			payerType: "STAFF",
			studentId: null,
			staffProfileId: "staff-1",
			title: "January Salary",
			amount: 1000,
			amountPaid: 0,
			status: "PENDING",
			collectionStatus: "NOT_REQUIRED",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			stream: { id: "stream-salary", accountType: "DEBIT" },
		};
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeCharge: {
						findFirst: async () => charge,
						update: async ({ data }: any) => ({ ...charge, ...data }),
					},
					financePayment: {
						create: async ({ data }: any) => ({
							id: "payment-salary",
							paymentDate: data.paymentDate,
							...data,
						}),
					},
					financePaymentAllocation: {
						create: async ({ data }: any) => ({ id: "allocation-salary", ...data }),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-salary", ...data };
						},
					},
					inventory: { findFirst: async () => null },
					inventoryIssuance: { create: async () => undefined },
				}),
		};

		const result = await recordFinancePayment(createFinanceCtx({ db }), {
			chargeId: "charge-salary",
			amount: 400,
			paymentDate: new Date("2026-02-10"),
			method: "transfer",
			reference: "SAL-1",
			note: "Part salary",
			receivedById: null,
			collectedTermId: "term-1",
			collectedSessionId: "session-1",
		});

		expect(result).toMatchObject({
			success: true,
			chargeStatus: "PARTIALLY_PAID",
		});
		expect(createdLedgerEntries[0]).toMatchObject({
			streamId: "stream-salary",
			direction: "DEBIT",
			sourceType: "PAYMENT",
			sourceId: "payment-salary",
			collectedSessionTermId: "term-1",
			collectedSchoolSessionId: "session-1",
		});
	});
});

describe("getFinanceTermAccountStatement", () => {
	test("returns an operator-facing account statement for the selected term", async () => {
		const ledgerCalls: any[] = [];
		const db = {
			financeStream: {
				findFirst: async (args: any) => {
					expect(args.where).toMatchObject({
						id: "stream-fees",
						schoolProfileId: "school-1",
						deletedAt: null,
					});
					return {
						id: "stream-fees",
						name: "School Fees",
						slug: "school-fees",
						accountType: "CREDIT",
						description: "Main fee collection",
					};
				},
			},
			financeLedgerEntry: {
				findMany: async (args: any) => {
					ledgerCalls.push(args);
					return [
						{
							id: "ledger-in",
							direction: "CREDIT",
							sourceType: "PAYMENT",
							sourceId: "payment-1",
							amount: 1000,
							occurredAt: new Date("2026-02-01"),
							createdAt: new Date("2026-02-01"),
							collectedSessionTermId: "term-1",
							collectedSchoolSessionId: "session-1",
							note: "Tuition payment",
							charge: {
								id: "charge-1",
								title: "Tuition",
								payerType: "STUDENT",
								status: "PAID",
								sessionTermId: "term-1",
								schoolSessionId: "session-1",
								student: {
									id: "student-1",
									name: "Aisha",
									surname: "Bello",
									otherName: null,
								},
								staffProfile: null,
							},
							payment: {
								id: "payment-1",
								reference: "R-001",
								method: "cash",
								status: "CONFIRMED",
								paymentDate: new Date("2026-02-01"),
							},
							transfer: null,
						},
						{
							id: "ledger-out",
							direction: "DEBIT",
							sourceType: "TRANSFER",
							sourceId: "transfer-1",
							amount: 350,
							occurredAt: new Date("2026-02-02"),
							createdAt: new Date("2026-02-02"),
							collectedSessionTermId: "term-1",
							collectedSchoolSessionId: "session-1",
							note: "Move to salary account",
							charge: null,
							payment: null,
							transfer: {
								id: "transfer-1",
								note: "Move to salary account",
								status: "COMPLETED",
								fromStreamId: "stream-fees",
								toStreamId: "stream-salary",
							},
						},
					];
				},
			},
		};

		const result = await getFinanceTermAccountStatement(
			createFinanceCtx({ db }),
			{ streamId: "stream-fees", termId: null, sessionId: null },
		);

		expect(ledgerCalls[0].where).toMatchObject({
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			deletedAt: null,
		});
		expect(result.account).toMatchObject({
			id: "stream-fees",
			name: "School Fees",
			technicalAccountType: "CREDIT",
			labels: {
				moneyIn: "Money In",
				moneyOut: "Money Out",
				availableBalance: "Available Balance",
				deficit: "Deficit",
				needsFunding: "Needs Funding",
			},
		});
		expect(result.summary).toEqual({
			moneyIn: 1000,
			moneyOut: 350,
			availableBalance: 650,
			deficit: 0,
			needsFunding: false,
			entryCount: 2,
		});
		expect(result.entries.map((entry) => entry.direction)).toEqual([
			"money-in",
			"money-out",
		]);
		expect(result.entries[0]).toMatchObject({
			id: "ledger-in",
			payerName: "Bello Aisha",
			ledgerDirection: "CREDIT",
			collectedSessionTermId: "term-1",
			paidForSessionTermId: "term-1",
		});
	});

	test("rejects non-finance roles", async () => {
		await expect(
			getFinanceTermAccountStatement(
				createFinanceCtx({ role: "Teacher", db: {} }),
				{ streamId: "stream-fees", termId: "term-1", sessionId: null },
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});

describe("transferFinanceFunds", () => {
	test("creates two-sided ledger entries for a normal transfer", async () => {
		const createdEntries: any[] = [];
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async ({ where }: any) =>
							where.id === "stream-fees"
								? { id: "stream-fees", name: "School Fees" }
								: { id: "stream-salary", name: "Salary" },
					},
					financeLedgerEntry: {
						findMany: async () => [
							{ direction: "CREDIT", amount: 1000 },
							{ direction: "DEBIT", amount: 100 },
						],
						createMany: async ({ data }: any) => {
							createdEntries.push(...data);
							return { count: data.length };
						},
					},
					financeTransfer: {
						create: async ({ data }: any) => ({ id: "transfer-1", ...data }),
					},
				}),
		};

		const result = await transferFinanceFunds(createFinanceCtx({ db }), {
			fromStreamId: "stream-fees",
			toStreamId: "stream-salary",
			amount: 300,
			note: "Fund salary account",
			sentById: null,
		});

		expect(result).toEqual({ success: true, transferId: "transfer-1" });
		expect(createdEntries).toHaveLength(2);
		expect(createdEntries[0]).toMatchObject({
			streamId: "stream-fees",
			direction: "DEBIT",
			sourceType: "TRANSFER",
			sourceId: "transfer-1",
			note: "Fund salary account",
			transferId: "transfer-1",
		});
		expect(createdEntries[1]).toMatchObject({
			streamId: "stream-salary",
			direction: "CREDIT",
			sourceType: "TRANSFER",
			sourceId: "transfer-1",
			transferId: "transfer-1",
		});
	});

	test("requires Admin for large transfers", async () => {
		await expect(
			transferFinanceFunds(
				createFinanceCtx({ role: "Accountant", db: {} }),
				{
					fromStreamId: "stream-fees",
					toStreamId: "stream-salary",
					amount: 250_001,
					note: "Large movement",
					sentById: null,
				},
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("blocks non-admin transfers that exceed available source balance", async () => {
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async ({ where }: any) =>
							where.id === "stream-fees"
								? { id: "stream-fees", name: "School Fees" }
								: { id: "stream-salary", name: "Salary" },
					},
					financeLedgerEntry: {
						findMany: async () => [{ direction: "CREDIT", amount: 100 }],
					},
				}),
		};

		await expect(
			transferFinanceFunds(
				createFinanceCtx({ role: "Accountant", db }),
				{
					fromStreamId: "stream-fees",
					toStreamId: "stream-salary",
					amount: 300,
					note: "Fund salary account",
					sentById: null,
				},
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("closeFinanceTermLedger", () => {
	test("snapshots a term and creates per-account carry-forward opening entries", async () => {
		const carryForwardsCreated: any[] = [];
		const ledgerEntriesCreated: any[] = [];
		const sessionTermCalls: any[] = [];
		const db = {
			sessionTerm: {
				findFirst: async (args: any) => {
					sessionTermCalls.push(args);
					if (args.where.id === "term-1") {
						return {
							id: "term-1",
							title: "Second Term",
							startDate: new Date("2026-01-01"),
							endDate: new Date("2026-04-01"),
							sessionId: "session-1",
							session: { id: "session-1", title: "2026/2027" },
						};
					}
					return {
						id: "term-2",
						title: "Third Term",
						sessionId: "session-1",
					};
				},
			},
			financeTermLedgerClose: {
				findFirst: async () => null,
			},
			financeStream: {
				findMany: async () => [
					{
						id: "stream-fees",
						name: "School Fees",
						slug: "school-fees",
						accountType: "CREDIT",
						description: null,
						isSystem: true,
						ledgerEntries: [{ direction: "CREDIT", amount: 1000 }],
						_count: {
							charges: 1,
							payments: 1,
							incomingTransfers: 0,
							outgoingTransfers: 0,
						},
					},
					{
						id: "stream-salary",
						name: "Salary",
						slug: "salary",
						accountType: "DEBIT",
						description: null,
						isSystem: true,
						ledgerEntries: [{ direction: "DEBIT", amount: 200 }],
						_count: {
							charges: 1,
							payments: 1,
							incomingTransfers: 0,
							outgoingTransfers: 0,
						},
					},
				],
			},
			financeCharge: {
				findMany: async () => [],
			},
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeTermLedgerClose: {
						create: async ({ data }: any) => ({ id: "close-1", ...data }),
					},
					financeTermCarryForward: {
						create: async ({ data }: any) => {
							const row = { id: `carry-${carryForwardsCreated.length + 1}`, ...data };
							carryForwardsCreated.push(row);
							return row;
						},
						update: async ({ where, data }: any) => ({
							id: where.id,
							...data,
						}),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							const row = {
								id: `opening-${ledgerEntriesCreated.length + 1}`,
								...data,
							};
							ledgerEntriesCreated.push(row);
							return row;
						},
					},
				}),
		};

		const result = await closeFinanceTermLedger(createFinanceCtx({ db }), {
			termId: "term-1",
			sessionId: "session-1",
			nextTermId: null,
		});

		expect(result).toMatchObject({
			success: true,
			closeId: "close-1",
			status: "CLOSED",
		});
		expect(carryForwardsCreated).toHaveLength(2);
		expect(carryForwardsCreated[0]).toMatchObject({
			closeId: "close-1",
			streamId: "stream-fees",
			nextSessionTermId: "term-2",
			nextSchoolSessionId: "session-1",
			direction: "CREDIT",
		});
		expect(carryForwardsCreated[1]).toMatchObject({
			streamId: "stream-salary",
			direction: "DEBIT",
		});
		expect(ledgerEntriesCreated).toHaveLength(2);
		expect(ledgerEntriesCreated[0]).toMatchObject({
			streamId: "stream-fees",
			direction: "CREDIT",
			sourceType: "ADJUSTMENT",
			collectedSessionTermId: "term-2",
			collectedSchoolSessionId: "session-1",
		});
		expect(ledgerEntriesCreated[1]).toMatchObject({
			streamId: "stream-salary",
			direction: "DEBIT",
			collectedSessionTermId: "term-2",
		});
		expect(sessionTermCalls.length).toBeGreaterThanOrEqual(2);
	});

	test("blocks normal payment writes into a closed term", async () => {
		const charge = {
			id: "charge-closed",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "Closed term fee",
			amount: 100,
			amountPaid: 0,
			status: "PENDING",
			collectionStatus: "NOT_REQUIRED",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeCharge: {
						findFirst: async () => charge,
					},
					financeTermLedgerClose: {
						findFirst: async () => ({ id: "close-1" }),
					},
				}),
		};

		await expect(
			recordFinancePayment(createFinanceCtx({ db }), {
				chargeId: "charge-closed",
				amount: 100,
				paymentDate: new Date("2026-02-10"),
				method: "cash",
				reference: null,
				note: null,
				receivedById: null,
				collectedTermId: "term-1",
				collectedSessionId: "session-1",
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("payroll, purchases, and payee accounting", () => {
	test("saves a payroll structure with a computed net obligation amount", async () => {
		let createdStructure: any;
		const db = {
			staffProfile: {
				findFirst: async () => ({ id: "staff-1" }),
			},
			financeStream: {
				findFirst: async () => ({
					id: "stream-salary",
					name: "Salary/Wages",
					accountType: "DEBIT",
				}),
			},
			financePayrollStructure: {
				create: async ({ data }: any) => {
					createdStructure = data;
					return { id: "payroll-1", ...data };
				},
			},
		};

		const result = await upsertFinancePayrollStructure(
			createFinanceCtx({ db }),
			{
				id: null,
				staffProfileId: "staff-1",
				streamId: null,
				streamName: "Salary/Wages",
				title: "Teaching Staff Salary",
				cadence: "MONTHLY",
				baseAmount: 1000,
				allowanceAmount: 100,
				bonusAmount: 50,
				deductionAmount: 30,
				advanceAmount: 200,
				roleLabel: "Teaching",
				isActive: true,
				sessionId: null,
				termId: null,
				notes: "January structure",
			} as any,
		);

		expect(createdStructure).toMatchObject({
			schoolProfileId: "school-1",
			staffProfileId: "staff-1",
			streamId: "stream-salary",
			cadence: "MONTHLY",
			roleLabel: "Teaching",
		});
		expect(result).toMatchObject({
			id: "payroll-1",
			baseAmount: 1000,
			allowanceAmount: 100,
			bonusAmount: 50,
			deductionAmount: 30,
			advanceAmount: 200,
			netAmount: 920,
		});
	});

	test("records an immediate purchase through a reusable payee and debit ledger", async () => {
		const createdPayments: any[] = [];
		const createdLedgerEntries: any[] = [];
		let updatedPurchase: any;
		const charge = {
			id: "charge-purchase",
			schoolProfileId: "school-1",
			streamId: "stream-uniform",
			payerType: "SCHOOL",
			studentId: null,
			staffProfileId: null,
			payeeId: "payee-tailor",
			title: "Uniform cloth",
			amount: 500,
			amountPaid: 0,
			status: "PENDING",
			collectionStatus: "NOT_REQUIRED",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			stream: { id: "stream-uniform", accountType: "DEBIT" },
		};
		let transactionCount = 0;
		const db = {
			$transaction: async (fn: (tx: any) => unknown) => {
				transactionCount += 1;
				if (transactionCount === 1) {
					return fn({
						financeStream: {
							findFirst: async () => ({
								id: "stream-uniform",
								name: "Uniform Account",
								accountType: "DEBIT",
							}),
						},
						financePayee: {
							findFirst: async () => null,
							create: async ({ data }: any) => ({
								id: "payee-tailor",
								...data,
							}),
						},
						financeCharge: {
							create: async ({ data }: any) => ({ ...charge, ...data }),
						},
						financePurchase: {
							create: async ({ data }: any) => ({
								id: "purchase-1",
								...data,
							}),
						},
					});
				}

				return fn({
					financeCharge: {
						findFirst: async () => charge,
						update: async ({ data }: any) => ({ ...charge, ...data }),
					},
					financePayment: {
						create: async ({ data }: any) => {
							createdPayments.push(data);
							return {
								id: "payment-purchase",
								paymentDate: data.paymentDate,
								...data,
							};
						},
					},
					financePaymentAllocation: {
						create: async ({ data }: any) => ({ id: "allocation-purchase", ...data }),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-purchase", ...data };
						},
					},
					inventory: { findFirst: async () => null },
					inventoryIssuance: { create: async () => undefined },
				});
			},
			financePurchase: {
				update: async ({ data }: any) => {
					updatedPurchase = data;
					return { id: "purchase-1", ...data };
				},
			},
		};

		const result = await recordFinancePurchase(createFinanceCtx({ db }), {
			id: null,
			kind: "PURCHASE",
			streamId: "stream-uniform",
			streamName: null,
			payeeId: null,
			payeeName: "Tailor One",
			payeeType: "VENDOR",
			title: "Uniform cloth",
			description: "Bulk cloth",
			quantity: 10,
			unitCost: 50,
			totalCost: null,
			amountPaid: 500,
			method: "transfer",
			paymentDate: new Date("2026-02-15"),
			receiptNumber: "RC-1",
			reference: "PO-1",
			note: "Paid immediately",
			sessionId: null,
			termId: null,
		} as any);

		expect(result).toMatchObject({
			success: true,
			purchaseId: "purchase-1",
			chargeId: "charge-purchase",
			paymentId: "payment-purchase",
			streamId: "stream-uniform",
			payeeId: "payee-tailor",
			status: "PAID",
			totalCost: 500,
			amountPaid: 500,
		});
		expect(createdPayments[0]).toMatchObject({
			payeeId: "payee-tailor",
			streamId: "stream-uniform",
			payerType: "SCHOOL",
		});
		expect(createdLedgerEntries[0]).toMatchObject({
			streamId: "stream-uniform",
			direction: "DEBIT",
			sourceType: "PAYMENT",
			chargeId: "charge-purchase",
			paymentId: "payment-purchase",
		});
		expect(updatedPurchase).toMatchObject({
			paymentId: "payment-purchase",
			status: "PAID",
		});
	});

	test("cancels a paid purchase by reversing payment and preserving audit state", async () => {
		const ledgerReversals: any[] = [];
		const updatedRows: any[] = [];
		let transactionCount = 0;
		const db = {
			financePurchase: {
				findFirst: async () => ({
					id: "purchase-1",
					chargeId: "charge-purchase",
					paymentId: "payment-purchase",
					status: "PAID",
				}),
			},
			$transaction: async (fn: (tx: any) => unknown) => {
				transactionCount += 1;
				if (transactionCount === 1) {
					return fn({
						financePayment: {
							findFirst: async () => ({
								id: "payment-purchase",
								status: "PAID",
								reference: "PO-1",
								allocations: [
									{
										amount: 500,
										charge: {
											id: "charge-purchase",
											amountPaid: 500,
											collectionStatus: "NOT_REQUIRED",
										},
									},
								],
							}),
							update: async ({ data }: any) => {
								updatedRows.push({ type: "payment", data });
								return data;
							},
						},
						financeCharge: {
							update: async ({ data }: any) => {
								updatedRows.push({ type: "charge-reversal", data });
								return data;
							},
						},
						financeLedgerEntry: {
							findMany: async () => [
								{
									id: "ledger-original",
									schoolProfileId: "school-1",
									streamId: "stream-uniform",
									direction: "DEBIT",
									amount: 500,
									collectedSessionTermId: "term-1",
									collectedSchoolSessionId: "session-1",
									chargeId: "charge-purchase",
									paymentId: "payment-purchase",
								},
							],
							create: async ({ data }: any) => {
								ledgerReversals.push(data);
								return { id: "ledger-reversal", ...data };
							},
						},
					});
				}

				return fn({
					financePurchase: {
						update: async ({ data }: any) => {
							updatedRows.push({ type: "purchase", data });
							return data;
						},
					},
					financeCharge: {
						update: async ({ data }: any) => {
							updatedRows.push({ type: "charge-cancel", data });
							return data;
						},
					},
				});
			},
		};

		const result = await cancelFinancePurchase(createFinanceCtx({ db }), {
			purchaseId: "purchase-1",
			reason: "Vendor refunded the purchase",
		});

		expect(result).toMatchObject({
			success: true,
			purchaseId: "purchase-1",
			status: "REFUNDED",
			reversedPaymentId: "payment-purchase",
		});
		expect(ledgerReversals[0]).toMatchObject({
			streamId: "stream-uniform",
			direction: "CREDIT",
			sourceType: "PAYMENT",
			paymentId: "payment-purchase",
			note: "Vendor refunded the purchase",
		});
		expect(updatedRows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "purchase",
					data: expect.objectContaining({
						status: "REFUNDED",
						cancellationReason: "Vendor refunded the purchase",
					}),
				}),
				expect.objectContaining({
					type: "charge-cancel",
					data: expect.objectContaining({
						status: "CANCELLED",
						cancellationReason: "Vendor refunded the purchase",
					}),
				}),
			]),
		);
	});

	test("summarizes product project funding, costs, sales, and profit", async () => {
		const db = {
			financeStream: {
				findFirst: async () => ({
					id: "stream-uniform",
					name: "Uniform Account",
					slug: "uniform-account",
					accountType: "DEBIT",
					description: null,
				}),
			},
			financeLedgerEntry: {
				findMany: async () => [
					{
						id: "transfer-in",
						direction: "CREDIT",
						sourceType: "TRANSFER",
						sourceId: "transfer-1",
						amount: 1000,
						occurredAt: new Date("2026-02-01"),
						createdAt: new Date("2026-02-01"),
						collectedSessionTermId: "term-1",
						collectedSchoolSessionId: "session-1",
						note: "Fund uniform account",
						charge: null,
						payment: null,
						transfer: {
							id: "transfer-1",
							note: "Fund uniform account",
							status: "COMPLETED",
							fromStreamId: "stream-fees",
							toStreamId: "stream-uniform",
						},
					},
					{
						id: "sale-in",
						direction: "CREDIT",
						sourceType: "PAYMENT",
						sourceId: "payment-sale",
						amount: 900,
						occurredAt: new Date("2026-02-03"),
						createdAt: new Date("2026-02-03"),
						collectedSessionTermId: "term-1",
						collectedSchoolSessionId: "session-1",
						note: "Uniform sale",
						charge: {
							id: "charge-sale",
							title: "Uniform",
							payerType: "STUDENT",
							status: "PAID",
							sessionTermId: "term-1",
							schoolSessionId: "session-1",
							student: {
								id: "student-1",
								name: "Aisha",
								surname: "Bello",
								otherName: null,
							},
							staffProfile: null,
						},
						payment: {
							id: "payment-sale",
							reference: "SALE-1",
							method: "cash",
							status: "PAID",
							paymentDate: new Date("2026-02-03"),
						},
						transfer: null,
					},
					{
						id: "purchase-out",
						direction: "DEBIT",
						sourceType: "PAYMENT",
						sourceId: "payment-purchase",
						amount: 400,
						occurredAt: new Date("2026-02-02"),
						createdAt: new Date("2026-02-02"),
						collectedSessionTermId: "term-1",
						collectedSchoolSessionId: "session-1",
						note: "Buy cloth",
						charge: {
							id: "charge-purchase",
							title: "Cloth",
							payerType: "SCHOOL",
							status: "PAID",
							sessionTermId: "term-1",
							schoolSessionId: "session-1",
							student: null,
							staffProfile: null,
						},
						payment: {
							id: "payment-purchase",
							reference: "P-1",
							method: "transfer",
							status: "PAID",
							paymentDate: new Date("2026-02-02"),
						},
						transfer: null,
					},
				],
			},
			financePurchase: {
				findMany: async () => [
					{
						id: "purchase-1",
						kind: "PURCHASE",
						status: "PAID",
						title: "Cloth",
						description: null,
						quantity: 1,
						unitCost: 400,
						totalCost: 400,
						amountPaid: 400,
						receiptNumber: "P-1",
						reference: "P-1",
						occurredAt: new Date("2026-02-02"),
						payee: { id: "payee-1", name: "Vendor", type: "VENDOR" },
						charge: { id: "charge-purchase", title: "Cloth", status: "PAID" },
						payment: { id: "payment-purchase", reference: "P-1", method: "transfer" },
					},
					{
						id: "purchase-2",
						kind: "LABOR",
						status: "PAID",
						title: "Tailor labor",
						description: null,
						quantity: 1,
						unitCost: 150,
						totalCost: 150,
						amountPaid: 150,
						receiptNumber: null,
						reference: null,
						occurredAt: new Date("2026-02-04"),
						payee: { id: "payee-2", name: "Tailor", type: "CASUAL_WORKER" },
						charge: { id: "charge-labor", title: "Tailor labor", status: "PAID" },
						payment: { id: "payment-labor", reference: null, method: "cash" },
					},
				],
			},
		};

		const result = await getFinanceProjectAccountSummary(
			createFinanceCtx({ db }),
			{ streamId: "stream-uniform", termId: null, sessionId: null },
		);

		expect(result.summary).toMatchObject({
			moneyIn: 1900,
			moneyOut: 400,
			availableBalance: 1500,
			transferredFunding: 1000,
			salesIncome: 900,
			purchaseCost: 400,
			laborCost: 150,
			totalCost: 550,
			profitLoss: 350,
		});
		expect(result.purchases).toHaveLength(2);
	});

	test("returns staff and payee finance histories linked to canonical records", async () => {
		const db = {
			staffProfile: {
				findFirst: async () => ({
					id: "staff-1",
					name: "Teacher One",
					title: "Teacher",
					email: "teacher@example.com",
					phone: "123",
				}),
			},
			financePayrollStructure: {
				findMany: async () => [
					{
						id: "structure-1",
						title: "Monthly Salary",
						cadence: "MONTHLY",
						baseAmount: 1000,
						allowanceAmount: 100,
						deductionAmount: 50,
						advanceAmount: 0,
						bonusAmount: 0,
						netAmount: 1050,
						isActive: true,
						stream: { id: "stream-salary", name: "Salary/Wages", accountType: "DEBIT" },
					},
				],
			},
			financeCharge: {
				findMany: async (args: any) =>
					args.where.staffProfileId
						? [
								{
									id: "charge-salary",
									title: "January Salary",
									description: null,
									amount: 1050,
									amountPaid: 500,
									status: "PARTIALLY_PAID",
									stream: {
										id: "stream-salary",
										name: "Salary/Wages",
										accountType: "DEBIT",
									},
									payrollStructure: {
										id: "structure-1",
										title: "Monthly Salary",
										cadence: "MONTHLY",
									},
									allocations: [
										{
											amount: 500,
											payment: {
												id: "payment-salary",
												amount: 500,
												paymentDate: new Date("2026-02-01"),
												method: "transfer",
												reference: "SAL-1",
												status: "PAID",
											},
										},
									],
								},
							]
						: [
								{
									id: "charge-vendor",
									title: "Repair",
									description: null,
									amount: 300,
									amountPaid: 300,
									status: "PAID",
									stream: {
										id: "stream-maintenance",
										name: "Maintenance",
										accountType: "DEBIT",
									},
									allocations: [
										{
											amount: 300,
											payment: {
												id: "payment-vendor",
												amount: 300,
												paymentDate: new Date("2026-02-02"),
												method: "cash",
												reference: "VEN-1",
												status: "PAID",
											},
										},
									],
								},
							],
			},
			financePayee: {
				findFirst: async () => ({
					id: "payee-1",
					name: "Vendor One",
					type: "VENDOR",
					phone: "555",
					email: null,
				}),
			},
			financePurchase: {
				findMany: async () => [
					{
						id: "purchase-vendor",
						kind: "SERVICE",
						status: "PAID",
						title: "Repair",
						description: "Door repair",
						totalCost: 300,
						amountPaid: 300,
						receiptNumber: "R-1",
						reference: "VEN-1",
						occurredAt: new Date("2026-02-02"),
						stream: {
							id: "stream-maintenance",
							name: "Maintenance",
							accountType: "DEBIT",
						},
						charge: { id: "charge-vendor", title: "Repair", status: "PAID" },
						payment: {
							id: "payment-vendor",
							reference: "VEN-1",
							method: "cash",
							paymentDate: new Date("2026-02-02"),
							status: "PAID",
						},
					},
				],
			},
		};

		const staffHistory = await getFinanceStaffHistory(
			createFinanceCtx({ db }),
			{ staffProfileId: "staff-1", termId: null, sessionId: null },
		);
		const payeeHistory = await getFinancePayeeHistory(
			createFinanceCtx({ db }),
			{ payeeId: "payee-1", termId: null, sessionId: null },
		);

		expect(staffHistory.summary).toMatchObject({
			totalDue: 1050,
			totalPaid: 500,
			totalOutstanding: 550,
			activeStructureCount: 1,
		});
		expect(staffHistory.charges[0]).toMatchObject({
			id: "charge-salary",
			receipts: [{ id: "payment-salary", amount: 500 }],
		});
		expect(payeeHistory.summary).toMatchObject({
			totalCost: 300,
			totalPaid: 300,
			totalOutstanding: 0,
			purchaseCount: 1,
			chargeCount: 1,
		});
		expect(payeeHistory.purchases[0]).toMatchObject({
			id: "purchase-vendor",
			charge: { id: "charge-vendor" },
			payment: { id: "payment-vendor" },
		});
	});
});

describe("finance report routes", () => {
	test("return report exports and pre-close integrity checks", async () => {
		const streamRows = [
			{
				id: "stream-fees",
				name: "School Fees",
				slug: "school-fees",
				accountType: "CREDIT",
				description: null,
				isSystem: true,
				ledgerEntries: [{ direction: "CREDIT", amount: 1000 }],
				_count: {
					charges: 1,
					payments: 1,
					incomingTransfers: 0,
					outgoingTransfers: 0,
				},
			},
			{
				id: "stream-salary",
				name: "Salary/Wages",
				slug: "salary-wages",
				accountType: "DEBIT",
				description: null,
				isSystem: true,
				ledgerEntries: [{ direction: "DEBIT", amount: 250 }],
				_count: {
					charges: 1,
					payments: 1,
					incomingTransfers: 0,
					outgoingTransfers: 0,
				},
			},
		];
		const db = {
			session: {
				findFirst: async () => ({
					id: "auth-session",
					token: "auth-session",
					user: {
						id: "user-1",
						email: "admin@example.com",
						name: "Admin",
						role: "Admin",
						saasAccountId: null,
					},
				}),
			},
			financeStream: {
				findMany: async () => streamRows,
			},
			financeCharge: {
				findMany: async (args: any) => {
					if (args.where?.payerType?.in) {
						return [
							{
								id: "payable-1",
								title: "Salary payable",
								amount: 500,
								amountPaid: 250,
								stream: { id: "stream-salary", name: "Salary/Wages" },
							},
						];
					}
					if (args.where?.studentId) {
						return [
							{
								id: "arrears-1",
								title: "Tuition",
								amount: 1000,
								amountPaid: 400,
								status: "PARTIALLY_PAID",
								stream: {
									id: "stream-fees",
									name: "School Fees",
									accountType: "CREDIT",
								},
								student: {
									id: "student-1",
									name: "Aisha",
									surname: "Bello",
									otherName: null,
								},
							},
						];
					}

					return [
						{
							id: "salary-1",
							title: "January Salary",
							description: null,
							amount: 500,
							amountPaid: 250,
							status: "PARTIALLY_PAID",
							collectionStatus: "NOT_REQUIRED",
							payerType: "STAFF",
							studentId: null,
							studentTermFormId: null,
							staffTermProfileId: null,
							payeeId: null,
							payee: null,
							payrollStructureId: null,
							payrollStructure: null,
							classroomDepartmentId: null,
							streamId: "stream-salary",
							walletId: "stream-salary",
							stream: {
								id: "stream-salary",
								name: "Salary/Wages",
								accountType: "DEBIT",
							},
							item: { id: "item-salary", type: "SALARY", name: "Salary" },
							student: null,
							staffProfile: { id: "staff-1", name: "Teacher One", title: "Teacher" },
							staffTermProfile: null,
							classroomDepartment: null,
							createdAt: new Date("2026-02-01"),
						},
					];
				},
			},
			financeLedgerEntry: {
				findMany: async (args: any) => {
					if (args.where?.OR) {
						return [
							{
								id: "cancelled-effect",
								sourceType: "PAYMENT",
								sourceId: "payment-cancelled",
								amount: 50,
								chargeId: "charge-cancelled",
								paymentId: "payment-cancelled",
							},
						];
					}
					return [
						{
							id: "missing-term",
							sourceType: "PAYMENT",
							amount: 100,
							occurredAt: new Date("2026-02-01"),
						},
					];
				},
			},
			financeTransfer: {
				findMany: async () => [
					{
						id: "transfer-1",
						amount: 100,
						status: "CANCELLED",
						note: "Cancelled transfer",
						sentById: "user-1",
						createdAt: new Date("2026-02-02"),
						fromStream: { id: "stream-fees", name: "School Fees" },
						toStream: { id: "stream-salary", name: "Salary/Wages" },
					},
				],
			},
			financeTermCarryForward: {
				findMany: async (args: any) =>
					args.include
						? [
								{
									id: "carry-1",
									streamId: "stream-fees",
									amount: 100,
									direction: "CREDIT",
									createdAt: new Date("2026-02-03"),
									stream: { id: "stream-fees", name: "School Fees" },
								},
							]
						: [
								{
									id: "carry-1",
									streamId: "stream-fees",
									amount: 100,
									direction: "CREDIT",
								},
							],
			},
			financePurchase: {
				findMany: async () => [
					{
						id: "purchase-1",
						kind: "SERVICE",
						status: "PAID",
						title: "Repair",
						description: null,
						quantity: 1,
						unitCost: 300,
						totalCost: 300,
						amountPaid: 300,
						receiptNumber: "RC-1",
						reference: "REF-1",
						occurredAt: new Date("2026-02-04"),
						createdById: "user-1",
						stream: {
							id: "stream-salary",
							name: "Salary/Wages",
							accountType: "DEBIT",
						},
						payee: { id: "payee-1", name: "Vendor", type: "VENDOR" },
						charge: { id: "charge-1", title: "Repair", status: "PAID" },
						payment: {
							id: "payment-1",
							reference: "REF-1",
							method: "cash",
							status: "PAID",
							receivedById: "user-1",
						},
					},
				],
			},
			financePayment: {
				findMany: async () => [
					{
						id: "payment-1",
						amount: 300,
						status: "PAID",
						paymentDate: new Date("2026-02-04"),
						receivedById: "user-1",
						stream: {
							id: "stream-salary",
							name: "Salary/Wages",
							accountType: "DEBIT",
						},
						staffProfile: null,
						payee: { id: "payee-1", name: "Vendor", type: "VENDOR" },
					},
				],
			},
			financeTermLedgerClose: {
				findMany: async () => [
					{
						id: "close-1",
						status: "CLOSED",
						closedById: "user-1",
						reopenedById: null,
						closedAt: new Date("2026-02-05"),
						reopenedAt: null,
						createdAt: new Date("2026-02-05"),
					},
				],
			},
			financePayee: {
				findMany: async () => [
					{
						id: "payee-1",
						name: "Vendor",
						type: "VENDOR",
						createdById: "user-1",
						createdAt: new Date("2026-02-01"),
					},
				],
			},
		};
		const caller = financeRouter.createCaller({
			profile: {
				authSessionId: "auth-session",
				schoolId: "school-1",
				termId: "term-1",
				sessionId: "session-1",
			},
			db,
		} as any);

		const integrity = await caller.getFinanceIntegrityReport({});
		const reports = await caller.getFinanceReports({});

		expect(integrity.checks.map((check) => check.key)).toContain(
			"pending-payables",
		);
		expect(integrity.mismatches).toMatchObject({
			pendingPayables: [{ id: "payable-1" }],
			unresolvedTransfers: [{ id: "transfer-1" }],
			unmatchedCarryForwards: [{ id: "carry-1" }],
		});
		expect(reports).toMatchObject({
			payroll: [{ id: "salary-1" }],
			purchases: [{ id: "purchase-1", totalCost: 300 }],
			arrears: [{ id: "arrears-1", outstanding: 600 }],
			productProjectAccounts: [
				{ id: "stream-fees", profitLoss: 1000 },
				{ id: "stream-salary", profitLoss: -250 },
			],
		});
		expect(reports.auditTrail).toMatchObject({
			payments: [{ id: "payment-1", action: "payment-recorded" }],
			purchases: [{ id: "purchase-1", action: "purchase-recorded" }],
			payees: [{ id: "payee-1", action: "payee-available" }],
		});
	});
});

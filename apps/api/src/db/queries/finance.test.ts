import { describe, expect, test } from "bun:test";
import { TRPCError } from "@trpc/server";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";

const {
	buildFinanceWorkspaceAccounts,
	buildSpendCategoryWhere,
	getFinanceHomeSummary,
	listFinanceCharges,
	payFinanceStaffCharges,
	closeFinanceTermLedger,
	cancelFinancePurchase,
	createFinancePayrollObligation,
	createFinanceSalaryRun,
	getFinanceSalaryRunPreview,
	listFinancePayrollSetup,
	monthPeriodBounds,
	getFinancePayeeHistory,
	getFinanceAccounts,
	getFinanceWorkspaceSummary,
	getFinanceProjectAccountSummary,
	getFinanceStaffHistory,
	getFinanceTermAccountStatement,
	getFinanceTermLedger,
	getReceivePaymentOptions,
	recordFinancePurchase,
	recordFinancePayment,
	reconcileStudentTermChargesForForm,
	receiveStudentPaymentSimple,
	searchFinanceStudents,
	transferFinanceFunds,
	upsertFinanceItem,
	upsertFinancePayee,
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

function createReceivePaymentTermForm({
	id,
	termId,
	sessionId,
	classroomDepartmentId,
	classroomName,
	departmentName,
	termTitle,
	sessionTitle,
	startDate,
}: {
	id: string;
	termId: string;
	sessionId: string;
	classroomDepartmentId: string;
	classroomName: string;
	departmentName: string;
	termTitle: string;
	sessionTitle: string;
	startDate: string;
}) {
	const date = new Date(startDate);
	return {
		id,
		studentId: "student-1",
		sessionTermId: termId,
		schoolSessionId: sessionId,
		classroomDepartmentId,
		createdAt: date,
		classroomDepartment: {
			id: classroomDepartmentId,
			departmentName,
			classRoom: { id: `class-${id}`, name: classroomName },
		},
		sessionTerm: {
			id: termId,
			title: termTitle,
			startDate: date,
			session: { id: sessionId, title: sessionTitle },
		},
	};
}

describe("searchFinanceStudents", () => {
	test("lists each canonical student once and scopes registration details to the active term", async () => {
		let findManyArgs: Record<string, unknown> | undefined;
		const currentStudent = {
			id: "student-current",
			name: "Fatimah",
			surname: "Ajanji",
			otherName: null,
			termForms: [
				{
					id: "term-form-current",
					sessionTermId: "term-current",
					schoolSessionId: "session-current",
					classroomDepartment: {
						id: "department-current",
						departmentName: "B",
						classRoom: { name: "Primary 2" },
					},
					sessionTerm: { title: "Second Term" },
				},
			],
		};
		const historicalStudentWithSameName = {
			...currentStudent,
			id: "student-historical",
			termForms: [
				{
					...currentStudent.termForms[0],
					id: "term-form-historical",
					sessionTermId: "term-historical",
					schoolSessionId: "session-historical",
					sessionTerm: { title: "First Term" },
				},
			],
		};
		const db = {
			students: {
				findMany: async (args: Record<string, unknown>) => {
					findManyArgs = args;
					const activeTermId = (
						args.where as {
							termForms?: { some?: { sessionTermId?: string } };
						}
					).termForms?.some?.sessionTermId;
					return activeTermId === "term-current"
						? [currentStudent]
						: [historicalStudentWithSameName, currentStudent];
				},
			},
		};

		const result = await searchFinanceStudents(
			createFinanceCtx({
				db,
				termId: "term-current",
				sessionId: "session-current",
			}),
			{ currentTermOnly: true },
		);

		expect(findManyArgs).toMatchObject({
			where: {
				schoolProfileId: "school-1",
				deletedAt: null,
				termForms: {
					some: {
						schoolProfileId: "school-1",
						sessionTermId: "term-current",
						schoolSessionId: "session-current",
						deletedAt: null,
					},
				},
			},
			select: {
				termForms: {
					where: {
						schoolProfileId: "school-1",
						sessionTermId: "term-current",
						schoolSessionId: "session-current",
						deletedAt: null,
					},
					take: 1,
				},
			},
			distinct: ["id"],
		});
		expect(result).toEqual([
			{
				id: "student-current",
				name: "Fatimah",
				surname: "Ajanji",
				otherName: null,
				classroomId: "department-current",
				classroom: "Primary 2 B",
				currentTermLabel: "Second Term",
				hasCurrentTermSheet: true,
			},
		]);
	});

	test("returns no payment-search students when the active term context is incomplete", async () => {
		let queried = false;
		const db = {
			students: {
				findMany: async () => {
					queried = true;
					return [];
				},
			},
		};

		const result = await searchFinanceStudents(
			createFinanceCtx({
				db,
				termId: "",
				sessionId: "session-current",
			}),
			{ query: "Fatimah", currentTermOnly: true },
		);

		expect(result).toEqual([]);
		expect(queried).toBe(false);
	});

	test("preserves the all-term search used by advanced finance flows", async () => {
		let findManyArgs: Record<string, unknown> | undefined;
		const db = {
			students: {
				findMany: async (args: Record<string, unknown>) => {
					findManyArgs = args;
					return [];
				},
			},
		};

		await searchFinanceStudents(
			createFinanceCtx({
				db,
				termId: "",
				sessionId: "",
			}),
			{ query: "Fatimah" },
		);

		expect(findManyArgs).toMatchObject({
			where: {
				schoolProfileId: "school-1",
				OR: [
					{ name: { contains: "Fatimah", mode: "insensitive" } },
					{ surname: { contains: "Fatimah", mode: "insensitive" } },
					{ otherName: { contains: "Fatimah", mode: "insensitive" } },
				],
			},
			select: {
				termForms: {
					take: 1,
					orderBy: { createdAt: "desc" },
				},
			},
		});
		expect(findManyArgs).not.toHaveProperty("distinct");
		expect(findManyArgs).not.toHaveProperty("where.termForms");
	});
});

describe("getReceivePaymentOptions", () => {
	test("defaults the paid-for term to the active term and lists historical term choices", async () => {
		const activeTermForm = createReceivePaymentTermForm({
			id: "term-form-current",
			termId: "term-current",
			sessionId: "session-current",
			classroomDepartmentId: "dept-current",
			classroomName: "Primary 4",
			departmentName: "B",
			termTitle: "Second Term",
			sessionTitle: "2026/2027",
			startDate: "2026-04-01",
		});
		const previousTermForm = createReceivePaymentTermForm({
			id: "term-form-previous",
			termId: "term-previous",
			sessionId: "session-previous",
			classroomDepartmentId: "dept-previous",
			classroomName: "Primary 3",
			departmentName: "A",
			termTitle: "First Term",
			sessionTitle: "2025/2026",
			startDate: "2025-09-01",
		});
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					$executeRaw: async () => undefined,
					studentTermForm: {
						findFirst: async () => activeTermForm,
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
					termForms: [previousTermForm, activeTermForm],
				}),
			},
			financeItem: {
				findMany: async () => [],
			},
			financeCharge: {
				findMany: async () => [],
			},
		};

		const result = await getReceivePaymentOptions(
			createFinanceCtx({
				db,
				termId: "term-current",
				sessionId: "session-current",
			}),
			{ studentId: "student-1", termId: "term-current" } as any,
		);

		expect(result.termOptions).toEqual([
			{
				id: "term-form-current",
				sessionTermId: "term-current",
				schoolSessionId: "session-current",
				termTitle: "Second Term",
				sessionTitle: "2026/2027",
				label: "2026/2027 · Second Term",
				classroom: "Primary 4 B",
				isCurrent: true,
				outstandingCount: 0,
				totalOutstanding: 0,
			},
			{
				id: "term-form-previous",
				sessionTermId: "term-previous",
				schoolSessionId: "session-previous",
				termTitle: "First Term",
				sessionTitle: "2025/2026",
				label: "2025/2026 · First Term",
				classroom: "Primary 3 A",
				isCurrent: false,
				outstandingCount: 0,
				totalOutstanding: 0,
			},
		]);
		expect(result.context).toMatchObject({
			termId: "term-current",
			sessionId: "session-current",
			collectedTermLabel: "2026/2027 · Second Term",
			paidForStudentTermFormId: "term-form-current",
			paidForTermId: "term-current",
			paidForSessionId: "session-current",
			paidForTermLabel: "2026/2027 · Second Term",
		});
	});

	test("scopes options to the selected previous term and prefers existing charges over configured items", async () => {
		const activeTermForm = createReceivePaymentTermForm({
			id: "term-form-current",
			termId: "term-current",
			sessionId: "session-current",
			classroomDepartmentId: "dept-current",
			classroomName: "Primary 4",
			departmentName: "B",
			termTitle: "Second Term",
			sessionTitle: "2026/2027",
			startDate: "2026-04-01",
		});
		const previousTermForm = createReceivePaymentTermForm({
			id: "term-form-previous",
			termId: "term-previous",
			sessionId: "session-previous",
			classroomDepartmentId: "dept-previous",
			classroomName: "Primary 3",
			departmentName: "A",
			termTitle: "First Term",
			sessionTitle: "2025/2026",
			startDate: "2025-09-01",
		});
		const configuredItems = [
			{
				id: "item-tuition",
				streamId: "stream-fees",
				type: "TUITION_FEE",
				name: "Tuition",
				description: "Previous term tuition",
				amount: 1000,
				collectable: true,
				isActive: true,
				schoolSessionId: "session-previous",
				sessionTermId: "term-previous",
				stream: {
					id: "stream-fees",
					name: "School Fees",
					accountType: "CREDIT",
				},
				applicableClasses: [],
			},
			{
				id: "item-exam",
				streamId: "stream-fees",
				type: "OTHER",
				name: "Exam Fee",
				description: "Previous term exam",
				amount: 300,
				collectable: true,
				isActive: true,
				schoolSessionId: "session-previous",
				sessionTermId: "term-previous",
				stream: {
					id: "stream-fees",
					name: "School Fees",
					accountType: "CREDIT",
				},
				applicableClasses: [],
			},
			{
				id: "item-paid",
				streamId: "stream-fees",
				type: "BOOK",
				name: "Paid Book",
				description: "Already settled",
				amount: 200,
				collectable: true,
				isActive: true,
				schoolSessionId: "session-previous",
				sessionTermId: "term-previous",
				stream: {
					id: "stream-fees",
					name: "School Fees",
					accountType: "CREDIT",
				},
				applicableClasses: [],
			},
		];
		const previousOutstanding = {
			id: "charge-tuition",
			streamId: "stream-fees",
			itemId: "item-tuition",
			title: "Tuition",
			description: "Previous term tuition",
			amount: 1000,
			amountPaid: 400,
			status: "PARTIALLY_PAID",
			sessionTermId: "term-previous",
			schoolSessionId: "session-previous",
			stream: {
				id: "stream-fees",
				name: "School Fees",
				accountType: "CREDIT",
			},
			item: {
				id: "item-tuition",
				type: "TUITION_FEE",
				name: "Tuition",
				isActive: false,
			},
			studentTermForm: previousTermForm,
		};
		const previousPaid = {
			...previousOutstanding,
			id: "charge-paid",
			itemId: "item-paid",
			title: "Paid Book",
			amount: 200,
			amountPaid: 200,
			status: "PAID",
			item: {
				id: "item-paid",
				type: "BOOK",
				name: "Paid Book",
				isActive: true,
			},
		};
		const currentOutstanding = {
			...previousOutstanding,
			id: "charge-current",
			itemId: "item-current",
			title: "Current Fee",
			sessionTermId: "term-current",
			schoolSessionId: "session-current",
			studentTermForm: activeTermForm,
		};
		let financeItemWhere: any;
		let financeChargeWhere: any;
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					$executeRaw: async () => undefined,
					studentTermForm: {
						findFirst: async () => previousTermForm,
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
					termForms: [activeTermForm, previousTermForm],
				}),
			},
			financeItem: {
				findMany: async (args: any) => {
					financeItemWhere = args.where;
					return configuredItems;
				},
			},
			financeCharge: {
				findMany: async (args: any) => {
					financeChargeWhere = args.where;
					return [previousOutstanding, previousPaid, currentOutstanding];
				},
			},
		};

		const result = await getReceivePaymentOptions(
			createFinanceCtx({
				db,
				termId: "term-current",
				sessionId: "session-current",
			}),
			{
				studentId: "student-1",
				paidForStudentTermFormId: "term-form-previous",
			} as any,
		);

		expect(financeItemWhere).toMatchObject({
			schoolProfileId: "school-1",
			OR: [{ sessionTermId: "term-previous" }, { sessionTermId: null }],
		});
		expect(financeChargeWhere.status).toEqual({
			notIn: ["CANCELLED", "WAIVED"],
		});
		expect(result.context).toMatchObject({
			termId: "term-current",
			sessionId: "session-current",
			collectedTermLabel: "2026/2027 · Second Term",
			paidForStudentTermFormId: "term-form-previous",
			paidForTermLabel: "2025/2026 · First Term",
		});
		expect(result.paymentTypes).toHaveLength(1);
		expect(result.paymentTypes[0]).toMatchObject({
			title: "School Fees",
			termLabel: "2025/2026 · First Term",
			hasOutstanding: true,
		});
		expect(result.paymentTypes[0]?.descriptions).toEqual([
			expect.objectContaining({
				source: "outstandingCharge",
				title: "Tuition",
				chargeId: "charge-tuition",
				studentTermFormId: "term-form-previous",
				termLabel: "2025/2026 · First Term",
				defaultAmount: 600,
			}),
			expect.objectContaining({
				source: "configuredItem",
				title: "Exam Fee",
				itemId: "item-exam",
				studentTermFormId: "term-form-previous",
				termLabel: "2025/2026 · First Term",
				defaultAmount: 300,
			}),
		]);
		expect(
			result.paymentTypes[0]?.descriptions.some(
				(option) => option.title === "Paid Book",
			),
		).toBe(false);
	});

	test("tenant-scopes term forms and rejects one not owned by the selected student", async () => {
		const db = {
			students: {
				findFirst: async (args: any) => {
					expect(args.select.termForms.where).toMatchObject({
						schoolProfileId: "school-1",
						deletedAt: null,
					});
					return {
						id: "student-1",
						name: "Aisha",
						surname: "Bello",
						otherName: null,
						termForms: [
							{
								id: "term-form-1",
								createdAt: new Date("2026-01-01"),
								sessionTermId: "term-1",
								schoolSessionId: "session-1",
								classroomDepartmentId: "dept-1",
								classroomDepartment: null,
								sessionTerm: {
									id: "term-1",
									title: "Second Term",
									startDate: new Date("2026-01-01"),
									session: { id: "session-1", title: "2026/2027" },
								},
							},
						],
					};
				},
			},
		};

		await expect(
			getReceivePaymentOptions(createFinanceCtx({ db }), {
				studentId: "student-1",
				paidForStudentTermFormId: "another-student-term-form",
			} as any),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "The selected student term was not found.",
		});
	});

	test("keeps the dashboard term as collected-in when the student has only historical forms", async () => {
		const historicalTermForm = {
			id: "term-form-historical",
			createdAt: new Date("2025-09-01"),
			sessionTermId: "term-historical",
			schoolSessionId: "session-historical",
			classroomDepartmentId: "dept-1",
			classroomDepartment: null,
			sessionTerm: {
				id: "term-historical",
				title: "1st Term",
				startDate: new Date("2025-09-01"),
				session: { id: "session-historical", title: "1446/1447" },
			},
		};
		const db = {
			students: {
				findFirst: async () => ({
					id: "student-1",
					name: "Aisha",
					surname: "Bello",
					otherName: null,
					termForms: [historicalTermForm],
				}),
			},
			sessionTerm: {
				findFirst: async () => ({
					id: "term-current",
					title: "2nd Term",
					session: { id: "session-current", title: "1447/1448" },
				}),
			},
			financeItem: { findMany: async () => [] },
			financeCharge: { findMany: async () => [] },
		};

		const result = await getReceivePaymentOptions(
			createFinanceCtx({
				db,
				termId: "term-current",
				sessionId: "session-current",
			}),
			{ studentId: "student-1" } as any,
		);

		expect(result.context).toMatchObject({
			termId: "term-current",
			sessionId: "session-current",
			paidForStudentTermFormId: "term-form-historical",
			paidForTermLabel: "1446/1447 · 1st Term",
			collectedTermLabel: "1447/1448 · 2nd Term",
		});
	});

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

		const result = await getReceivePaymentOptions(createFinanceCtx({ db }), {
			studentId: "student-1",
		} as any);

		expect(result.student).toMatchObject({
			id: "student-1",
			name: "Aisha Bello",
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
			"Books",
			"School Fees",
		]);
		expect(result.paymentTypes[0]).toMatchObject({
			streamId: "stream-books",
			hasOutstanding: false,
			defaultAmount: 250,
			termLabel: "2026/2027 · Second Term",
		});
		expect(result.paymentTypes[0]?.descriptions[0]).toMatchObject({
			source: "configuredItem",
			itemId: "item-book",
			amountDue: 250,
			termLabel: "2026/2027 · Second Term",
			isActive: true,
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
			getReceivePaymentOptions(createFinanceCtx({ role: "Teacher", db: {} }), {
				studentId: "student-1",
			} as any),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
	});
});

describe("upsertFinanceItem", () => {
	test("allows only Admins to create reusable finance items", async () => {
		await expect(
			upsertFinanceItem(createFinanceCtx({ role: "Accountant", db: {} }), {
				id: null,
				streamId: null,
				streamName: "Books",
				accountType: "CREDIT",
				type: "BOOK",
				name: "English Reader",
				description: "Primary English book",
				amount: 250,
				collectable: true,
				isActive: true,
				sessionId: "session-1",
				termId: "term-1",
				classRoomDepartmentIds: [],
			} as any),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
	});

	test("does not update a finance item from another school", async () => {
		let updateCalled = false;
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async () => ({
							id: "stream-books",
							name: "Books",
							accountType: "CREDIT",
						}),
					},
					financeItem: {
						findFirst: async () => null,
						update: async () => {
							updateCalled = true;
							return {};
						},
					},
					financeItemClassRoomDepartment: {
						deleteMany: async () => undefined,
						createMany: async () => undefined,
					},
				}),
		};

		await expect(
			upsertFinanceItem(createFinanceCtx({ db }), {
				id: "item-other-school",
				streamId: "stream-books",
				streamName: null,
				accountType: "CREDIT",
				type: "BOOK",
				name: "English Reader",
				description: null,
				amount: 250,
				collectable: true,
				isActive: true,
				sessionId: "session-1",
				termId: "term-1",
				classRoomDepartmentIds: [],
			} as any),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<TRPCError>);
		expect(updateCalled).toBe(false);
	});

	test("preserves the existing audience when a legacy edit omits it", async () => {
		let updateData: Record<string, unknown> | undefined;
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async () => ({
							id: "stream-books",
							name: "Books",
							accountType: "CREDIT",
						}),
					},
					financeItem: {
						findFirst: async () => ({ id: "item-1" }),
						update: async ({ data }: any) => {
							updateData = data;
							return { id: "item-1", ...data };
						},
					},
					financeItemClassRoomDepartment: {
						deleteMany: async () => undefined,
						createMany: async () => undefined,
					},
				}),
		};

		await upsertFinanceItem(createFinanceCtx({ db }), {
			id: "item-1",
			streamId: "stream-books",
			streamName: null,
			accountType: "CREDIT",
			type: "BOOK",
			name: "English Reader",
			description: null,
			amount: 250,
			collectable: true,
			isActive: true,
			sessionId: null,
			termId: null,
			classRoomDepartmentIds: [],
		} as any);

		expect(updateData).toBeDefined();
		expect(updateData).not.toHaveProperty("studentAudience");
		expect(updateData).not.toHaveProperty("studentGenderAudience");
	});

	test("creates separate same-named fee structures for different terms", async () => {
		const createdItems: Array<Record<string, unknown>> = [];
		const tx = {
			financeStream: {
				findFirst: async () => ({
					id: "stream-entrance",
					name: "Entrance Form",
					accountType: "CREDIT",
				}),
			},
			financeItem: {
				create: async ({ data }: any) => {
					const item = { id: `item-${createdItems.length + 1}`, ...data };
					createdItems.push(item);
					return item;
				},
			},
			financeItemClassRoomDepartment: {
				deleteMany: async () => undefined,
				createMany: async () => undefined,
			},
		};
		const db = {
			$transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
			studentTermForm: {
				findMany: async () => [],
			},
		};
		const baseInput = {
			id: null,
			streamId: "stream-entrance",
			streamName: "Entrance Form",
			accountType: "CREDIT",
			type: "OTHER",
			name: "Entrance Form",
			description: null,
			amount: 1_000,
			collectable: true,
			isActive: true,
			sessionId: "session-1",
			classRoomDepartmentIds: [],
			studentAudience: "NEW_ADMISSIONS_ONLY",
			studentGenderAudience: "FEMALE_ONLY",
		};

		await upsertFinanceItem(createFinanceCtx({ db }), {
			...baseInput,
			termId: "term-1",
		} as any);
		await upsertFinanceItem(createFinanceCtx({ db }), {
			...baseInput,
			termId: "term-2",
		} as any);

		expect(createdItems).toHaveLength(2);
		expect(createdItems[0]?.studentGenderAudience).toBe("FEMALE_ONLY");
		expect(createdItems.map((item) => item.sessionTermId)).toEqual([
			"term-1",
			"term-2",
		]);
	});
});

describe("reconcileStudentTermChargesForForm", () => {
	test("preserves an explicitly selected optional fee across repeated reconciliation", async () => {
		const charge = {
			id: "charge-1",
			itemId: "optional-item",
			amountPaid: 0,
			assignmentSource: "OPTIONAL_SELECTED",
			createdAt: new Date("2026-07-28"),
		};
		let cancellations = 0;
		const tx = {
			$executeRaw: async () => undefined,
			financeItem: {
				findMany: async () => [
					{
						id: "optional-item",
						streamId: "stream-1",
						name: "Optional club",
						description: null,
						amount: 500,
						collectable: false,
					},
				],
			},
			financeCharge: {
				findMany: async () => [charge],
				create: async () => {
					throw new Error("The selected optional charge already exists.");
				},
				update: async ({ data }: any) => {
					Object.assign(charge, data);
					return charge;
				},
				updateMany: async () => {
					cancellations++;
					return { count: 1 };
				},
			},
		};
		const input = {
			schoolProfileId: "school-1",
			termForm: {
				id: "term-form-1",
				studentId: "student-1",
				sessionTermId: "term-1",
				schoolSessionId: "session-1",
				classroomDepartmentId: "classroom-1",
				admissionType: "NEW_ADMISSION" as const,
				student: { gender: "Female" as const },
			},
		};

		await reconcileStudentTermChargesForForm(tx as any, input);
		await reconcileStudentTermChargesForForm(tx as any, input);

		expect(charge.assignmentSource).toBe("OPTIONAL_SELECTED");
		expect(cancellations).toBe(0);
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

describe("buildFinanceWorkspaceAccounts", () => {
	test("keeps transfers and adjustments in the ledger balance but out of cash movement", () => {
		const accounts = buildFinanceWorkspaceAccounts({
			streams: [
				{
					id: "fees",
					name: "School Fees",
					slug: "school-fees",
					accountType: "CREDIT",
					description: null,
					isSystem: true,
					_count: {
						charges: 1,
						payments: 1,
						incomingTransfers: 1,
						outgoingTransfers: 0,
					},
				},
			],
			ledgerEntries: [
				{
					streamId: "fees",
					direction: "CREDIT",
					sourceType: "PAYMENT",
					amount: 1_000,
					occurredAt: new Date("2026-01-01"),
				},
				{
					streamId: "fees",
					direction: "CREDIT",
					sourceType: "TRANSFER",
					amount: 300,
					occurredAt: new Date("2026-01-02"),
				},
				{
					streamId: "fees",
					direction: "CREDIT",
					sourceType: "ADJUSTMENT",
					amount: 200,
					occurredAt: new Date("2026-01-03"),
				},
				{
					streamId: "fees",
					direction: "DEBIT",
					sourceType: "PAYMENT",
					amount: 100,
					occurredAt: new Date("2026-01-04"),
				},
			],
			charges: [],
		});

		expect(accounts[0]).toMatchObject({
			moneyIn: 1_000,
			moneyOut: 100,
			ledgerBalance: 1_400,
			projectedBalance: 1_400,
			health: "healthy",
			activityCount: 4,
		});
	});

	test("subtracts pending school and staff obligations from projected balance", () => {
		const accounts = buildFinanceWorkspaceAccounts({
			streams: [
				{
					id: "salary",
					name: "Salary",
					slug: "salary",
					accountType: "DEBIT",
					description: null,
					isSystem: true,
					_count: {
						charges: 2,
						payments: 0,
						incomingTransfers: 0,
						outgoingTransfers: 0,
					},
				},
			],
			ledgerEntries: [
				{
					streamId: "salary",
					direction: "CREDIT",
					sourceType: "TRANSFER",
					amount: 500,
					occurredAt: new Date("2026-01-01"),
				},
			],
			charges: [
				{
					streamId: "salary",
					payerType: "STAFF",
					amount: 800,
					amountPaid: 100,
					status: "PARTIALLY_PAID",
				},
				{
					streamId: "salary",
					payerType: "STUDENT",
					amount: 2_000,
					amountPaid: 0,
					status: "PENDING",
				},
			],
		});

		expect(accounts[0]).toMatchObject({
			ledgerBalance: 500,
			pendingObligations: 700,
			pendingObligationsCount: 1,
			projectedBalance: -200,
			health: "needs_funding",
		});
	});
});

describe("finance workspace queries", () => {
	test("defaults ledger movement to the active term and derives funding health", async () => {
		const ledgerCalls: any[] = [];
		const streams = [
			{
				id: "fees",
				name: "School Fees",
				slug: "school-fees",
				accountType: "CREDIT",
				description: null,
				isSystem: true,
				_count: {
					charges: 1,
					payments: 1,
					incomingTransfers: 1,
					outgoingTransfers: 0,
				},
			},
			{
				id: "salary",
				name: "Salary",
				slug: "salary",
				accountType: "DEBIT",
				description: null,
				isSystem: true,
				_count: {
					charges: 1,
					payments: 0,
					incomingTransfers: 1,
					outgoingTransfers: 0,
				},
			},
		];
		const db = {
			financeStream: {
				findMany: async () => streams,
			},
			financeLedgerEntry: {
				findMany: async (args: any) => {
					ledgerCalls.push(args);
					return [
						{
							streamId: "fees",
							direction: "CREDIT",
							sourceType: "PAYMENT",
							amount: 1_000,
							occurredAt: new Date("2026-02-01"),
						},
						{
							streamId: "fees",
							direction: "CREDIT",
							sourceType: "TRANSFER",
							amount: 200,
							occurredAt: new Date("2026-02-02"),
						},
						{
							streamId: "fees",
							direction: "CREDIT",
							sourceType: "ADJUSTMENT",
							amount: 100,
							occurredAt: new Date("2026-02-03"),
						},
						{
							streamId: "salary",
							direction: "CREDIT",
							sourceType: "TRANSFER",
							amount: 500,
							occurredAt: new Date("2026-02-04"),
						},
					];
				},
			},
			financeCharge: {
				findMany: async () => [
					{
						streamId: "salary",
						payerType: "STAFF",
						amount: 800,
						amountPaid: 0,
						status: "PENDING",
					},
					{
						streamId: "fees",
						payerType: "STUDENT",
						amount: 600,
						amountPaid: 0,
						status: "PENDING",
					},
				],
			},
			sessionTerm: {
				findFirst: async () => ({
					title: "Second Term",
					session: { title: "2026/2027" },
				}),
			},
		};
		const ctx = createFinanceCtx({ role: "Accountant", db });

		const summary = await getFinanceWorkspaceSummary(ctx, {
			period: "term",
		} as any);
		const accounts = await getFinanceAccounts(ctx, {
			period: "term",
			health: ["needs_funding"],
			sortField: "projectedBalance",
			sortDirection: "asc",
			pageSize: 40,
		} as any);

		expect(ledgerCalls[0].where).toMatchObject({
			schoolProfileId: "school-1",
			collectedSessionTermId: "term-1",
			deletedAt: null,
		});
		expect(summary).toMatchObject({
			period: "term",
			periodLabel: "2026/2027 · Second Term",
			moneyIn: 1_000,
			moneyOut: 0,
			netMovement: 1_000,
			ledgerBalance: 1_800,
			pendingPayables: 800,
			studentOutstanding: 600,
			needsAttentionCount: 1,
		});
		expect(accounts).toMatchObject({
			meta: { cursor: null, hasNextPage: false, total: 1 },
			data: [
				{
					id: "salary",
					pendingObligations: 800,
					projectedBalance: -300,
					health: "needs_funding",
				},
			],
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
		onPaymentCreate,
		onLedgerCreate,
	}: {
		charge: any;
		stream: any;
		item?: any;
		onChargeCreate?: (data: any) => void;
		onStreamCreate?: (data: any) => void;
		onPaymentCreate?: (data: any) => void;
		onLedgerCreate?: (data: any) => void;
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
				create: async ({ data }: any) => {
					onPaymentCreate?.(data);
					return {
						id: "payment-1",
						paymentDate: data.paymentDate,
						...data,
					};
				},
			},
			financePaymentAllocation: {
				create: async ({ data }: any) => ({ id: "allocation-1", ...data }),
			},
			financeLedgerEntry: {
				create: async ({ data }: any) => {
					onLedgerCreate?.(data);
					return { id: "ledger-1", ...data };
				},
			},
			schoolInventory: {
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

	test("rejects an outstanding charge that does not belong to the selected paid-for term", async () => {
		const previousTermForm = {
			...termForm,
			id: "term-form-previous",
			sessionTermId: "term-previous",
			schoolSessionId: "session-previous",
			classroomDepartmentId: "dept-previous",
		};
		const currentCharge = {
			id: "charge-current",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "Current Tuition",
			amount: 1000,
			amountPaid: 0,
			status: "PENDING",
			collectionStatus: "NOT_REQUIRED",
			studentTermFormId: "term-form-1",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const tx = createPaymentTx({
			charge: currentCharge,
			stream: currentCharge.stream,
		});
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => previousTermForm },
			financeCharge: {
				findFirst: async () => ({
					id: currentCharge.id,
					amount: currentCharge.amount,
					amountPaid: currentCharge.amountPaid,
					studentTermFormId: currentCharge.studentTermFormId,
					sessionTermId: currentCharge.sessionTermId,
					schoolSessionId: currentCharge.schoolSessionId,
				}),
			},
			$transaction: async (fn: (transaction: any) => unknown) => fn(tx),
		};

		await expect(
			receiveStudentPaymentSimple(createFinanceCtx({ db }), {
				studentId: "student-1",
				studentTermFormId: "term-form-previous",
				chargeId: "charge-current",
				amountPaid: 100,
				termId: "term-1",
				sessionId: "session-1",
			} as any),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
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

	test("creates a missing previous-term charge while collecting cash in the active term", async () => {
		let createdCharge: any;
		let createdPayment: any;
		let createdLedgerEntry: any;
		const previousTermForm = {
			...termForm,
			id: "term-form-previous",
			sessionTermId: "term-previous",
			schoolSessionId: "session-previous",
			classroomDepartmentId: "dept-previous",
		};
		const item = {
			id: "item-previous-exam",
			type: "OTHER",
			name: "Previous Exam Fee",
			description: "Exam fee for the previous term",
			amount: 750,
			streamId: "stream-fees",
		};
		const stream = { id: "stream-fees", accountType: "CREDIT" };
		const tx = createPaymentTx({
			charge: null,
			stream,
			item,
			onChargeCreate: (data) => {
				createdCharge = data;
			},
			onPaymentCreate: (data) => {
				createdPayment = data;
			},
			onLedgerCreate: (data) => {
				createdLedgerEntry = data;
			},
		});
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => previousTermForm },
			financeItem: { findFirst: async () => item },
			financeTermLedgerClose: { findFirst: async () => null },
			$transaction: async (fn: (transaction: any) => unknown) => fn(tx),
		};

		const result = await receiveStudentPaymentSimple(createFinanceCtx({ db }), {
			studentId: "student-1",
			studentTermFormId: previousTermForm.id,
			chargeId: null,
			itemId: item.id,
			amountPaid: 750,
			method: "cash",
			paymentDate: new Date("2026-05-02"),
			termId: "term-current",
			sessionId: "session-current",
		} as any);

		expect(createdCharge).toMatchObject({
			studentTermFormId: "term-form-previous",
			classroomDepartmentId: "dept-previous",
			schoolSessionId: "session-previous",
			sessionTermId: "term-previous",
		});
		expect(createdPayment).toMatchObject({
			collectedSessionTermId: "term-current",
			collectedSchoolSessionId: "session-current",
		});
		expect(createdLedgerEntry).toMatchObject({
			collectedSessionTermId: "term-current",
			collectedSchoolSessionId: "session-current",
		});
		expect(result).toMatchObject({
			success: true,
			chargeStatus: "PAID",
		});
	});

	test("allows an existing previous-term charge to be paid after that term closes", async () => {
		const previousTermForm = {
			...termForm,
			id: "term-form-previous",
			sessionTermId: "term-previous",
			schoolSessionId: "session-previous",
		};
		const previousCharge = {
			id: "charge-previous",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "Previous Tuition",
			amount: 1000,
			amountPaid: 250,
			status: "PARTIALLY_PAID",
			collectionStatus: "NOT_REQUIRED",
			studentTermFormId: previousTermForm.id,
			sessionTermId: previousTermForm.sessionTermId,
			schoolSessionId: previousTermForm.schoolSessionId,
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const tx = createPaymentTx({
			charge: previousCharge,
			stream: previousCharge.stream,
		});
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => previousTermForm },
			financeCharge: {
				findFirst: async () => ({
					id: previousCharge.id,
					amount: previousCharge.amount,
					amountPaid: previousCharge.amountPaid,
					studentTermFormId: previousCharge.studentTermFormId,
					sessionTermId: previousCharge.sessionTermId,
					schoolSessionId: previousCharge.schoolSessionId,
				}),
			},
			financeTermLedgerClose: {
				findFirst: async ({ where }: any) =>
					where.sessionTermId === "term-previous"
						? { id: "closed-previous" }
						: null,
			},
			$transaction: async (fn: (transaction: any) => unknown) => fn(tx),
		};

		const result = await receiveStudentPaymentSimple(createFinanceCtx({ db }), {
			studentId: "student-1",
			studentTermFormId: previousTermForm.id,
			chargeId: previousCharge.id,
			amountPaid: 750,
			method: "cash",
			termId: "term-current",
			sessionId: "session-current",
		} as any);

		expect(result).toMatchObject({
			success: true,
			chargeStatus: "PAID",
		});
	});

	test("requires a closed previous term to be reopened before creating a missing charge", async () => {
		const previousTermForm = {
			...termForm,
			id: "term-form-previous",
			sessionTermId: "term-previous",
			schoolSessionId: "session-previous",
		};
		const item = {
			id: "item-previous-exam",
			type: "OTHER",
			name: "Previous Exam Fee",
			description: null,
			amount: 750,
			streamId: "stream-fees",
		};
		const db = {
			students: { findFirst: async () => ({ id: "student-1" }) },
			studentTermForm: { findFirst: async () => previousTermForm },
			financeItem: { findFirst: async () => item },
			financeTermLedgerClose: {
				findFirst: async ({ where }: any) =>
					where.sessionTermId === "term-previous"
						? { id: "closed-previous" }
						: null,
			},
		};

		await expect(
			receiveStudentPaymentSimple(createFinanceCtx({ db }), {
				studentId: "student-1",
				studentTermFormId: previousTermForm.id,
				chargeId: null,
				itemId: item.id,
				amountPaid: 750,
				termId: "term-current",
				sessionId: "session-current",
			} as any),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message:
				"This term ledger is closed. Reopen it before recording changes.",
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
	test("rejects payment writes from non-finance roles", async () => {
		await expect(
			recordFinancePayment(createFinanceCtx({ role: "Teacher", db: {} }), {
				chargeId: "charge-1",
				amount: 100,
				paymentDate: new Date("2026-02-10"),
				method: "cash",
				reference: null,
				note: null,
				receivedById: null,
				collectedTermId: "term-1",
				collectedSessionId: "session-1",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
	});

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
						create: async ({ data }: any) => ({
							id: "allocation-late",
							...data,
						}),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-late", ...data };
						},
					},
					schoolInventory: { findFirst: async () => null },
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

	test("rejects an amount above the charge outstanding balance", async () => {
		const charge = {
			id: "charge-partial",
			schoolProfileId: "school-1",
			streamId: "stream-fees",
			payerType: "STUDENT",
			studentId: "student-1",
			staffProfileId: null,
			title: "Tuition",
			amount: 1_000,
			amountPaid: 700,
			status: "PARTIALLY_PAID",
			collectionStatus: "NOT_COLLECTED",
			schoolSessionId: "session-1",
			sessionTermId: "term-1",
			stream: { id: "stream-fees", accountType: "CREDIT" },
		};
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeCharge: { findFirst: async () => charge },
				}),
		};

		await expect(
			recordFinancePayment(createFinanceCtx({ db }), {
				chargeId: "charge-partial",
				amount: 301,
				paymentDate: new Date("2026-08-02"),
				method: "CASH",
				reference: null,
				note: null,
				receivedById: null,
				collectedTermId: "term-1",
				collectedSessionId: "session-1",
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Payment amount cannot exceed the outstanding charge amount.",
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
						create: async ({ data }: any) => ({
							id: "allocation-salary",
							...data,
						}),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-salary", ...data };
						},
					},
					schoolInventory: { findFirst: async () => null },
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
			payerName: "Aisha Bello",
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
			transferFinanceFunds(createFinanceCtx({ role: "Accountant", db: {} }), {
				fromStreamId: "stream-fees",
				toStreamId: "stream-salary",
				amount: 250_001,
				note: "Large movement",
				sentById: null,
			}),
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
			transferFinanceFunds(createFinanceCtx({ role: "Accountant", db }), {
				fromStreamId: "stream-fees",
				toStreamId: "stream-salary",
				amount: 300,
				note: "Fund salary account",
				sentById: null,
			}),
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
			financeLedgerEntry: {
				findMany: async () => [],
			},
			financeTransfer: {
				findMany: async () => [],
			},
			financeTermCarryForward: {
				findMany: async () => [],
			},
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeTermLedgerClose: {
						create: async ({ data }: any) => ({ id: "close-1", ...data }),
					},
					financeTermCarryForward: {
						create: async ({ data }: any) => {
							const row = {
								id: `carry-${carryForwardsCreated.length + 1}`,
								...data,
							};
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
		expect(sessionTermCalls[1].where).toMatchObject({
			id: { not: "term-1" },
			sessionId: "session-1",
			startDate: { gt: new Date("2026-01-01") },
		});
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

	test("does not update a payee from another school", async () => {
		let updateCalled = false;
		const db = {
			financePayee: {
				findFirst: async () => null,
				update: async () => {
					updateCalled = true;
					return {};
				},
			},
		};

		await expect(
			upsertFinancePayee(createFinanceCtx({ db }), {
				id: "payee-other-school",
				name: "Tailor",
				type: "VENDOR",
				phone: null,
				email: null,
				note: null,
			} as any),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<TRPCError>);
		expect(updateCalled).toBe(false);
	});

	test("does not update a payroll structure from another school", async () => {
		let updateCalled = false;
		const db = {
			financeStream: {
				findFirst: async () => ({
					id: "stream-salary",
					name: "Salary/Wages",
					accountType: "DEBIT",
				}),
			},
			financePayrollStructure: {
				findFirst: async () => null,
				update: async () => {
					updateCalled = true;
					return {};
				},
			},
		};

		await expect(
			upsertFinancePayrollStructure(createFinanceCtx({ db }), {
				id: "payroll-other-school",
				staffProfileId: null,
				streamId: "stream-salary",
				streamName: null,
				title: "Teaching Staff Salary",
				cadence: "MONTHLY",
				baseAmount: 1000,
				allowanceAmount: 0,
				bonusAmount: 0,
				deductionAmount: 0,
				advanceAmount: 0,
				roleLabel: "Teaching",
				isActive: true,
				sessionId: "session-1",
				termId: "term-1",
				notes: null,
			} as any),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<TRPCError>);
		expect(updateCalled).toBe(false);
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
						create: async ({ data }: any) => ({
							id: "allocation-purchase",
							...data,
						}),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => {
							createdLedgerEntries.push(data);
							return { id: "ledger-purchase", ...data };
						},
					},
					schoolInventory: { findFirst: async () => null },
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
						payment: {
							id: "payment-purchase",
							reference: "P-1",
							method: "transfer",
						},
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
						charge: {
							id: "charge-labor",
							title: "Tailor labor",
							status: "PAID",
						},
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
						stream: {
							id: "stream-salary",
							name: "Salary/Wages",
							accountType: "DEBIT",
						},
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
							staffProfile: {
								id: "staff-1",
								name: "Teacher One",
								title: "Teacher",
							},
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

	test("rejects report access for non-finance roles", async () => {
		const db = {
			session: {
				findFirst: async () => ({
					id: "auth-session",
					token: "auth-session",
					user: {
						id: "user-1",
						email: "teacher@example.com",
						name: "Teacher",
						role: "Teacher",
						saasAccountId: null,
					},
				}),
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

		await expect(caller.getFinanceIntegrityReport({})).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
		await expect(caller.getFinanceReports({})).rejects.toMatchObject({
			code: "FORBIDDEN",
		} satisfies Partial<TRPCError>);
	});
});

describe("finance spending filters", () => {
	test("services cover legacy service items and recorded service purchases", () => {
		expect(buildSpendCategoryWhere("services", null)).toEqual({
			payerType: "SCHOOL",
			OR: [
				{ item: { is: { type: "SERVICE" } } },
				{ purchase: { is: { kind: { in: ["SERVICE", "LABOR", "VENDOR_BILL"] } } } },
			],
		});
	});

	test("purchases match goods purchases and can narrow by purpose", () => {
		expect(buildSpendCategoryWhere("purchases", "RESALE")).toEqual({
			payerType: "SCHOOL",
			purchase: {
				is: {
					kind: { in: ["PURCHASE", "DIRECT_EXPENSE", "REIMBURSEMENT"] },
					purpose: "RESALE",
				},
			},
		});
		expect(buildSpendCategoryWhere("purchases", null)).toEqual({
			payerType: "SCHOOL",
			purchase: {
				is: { kind: { in: ["PURCHASE", "DIRECT_EXPENSE", "REIMBURSEMENT"] } },
			},
		});
	});

	test("listFinanceCharges applies spend category and unpaid-only filters", async () => {
		let where: any = null;
		const db = {
			financeCharge: {
				findMany: async (args: any) => {
					where = args.where;
					return [
						{
							id: "charge-1",
							title: "Exercise books",
							amount: 500,
							amountPaid: 0,
							status: "PENDING",
							payerType: "SCHOOL",
							purchase: {
								id: "purchase-1",
								kind: "PURCHASE",
								purpose: "SCHOOL_USE",
								quantity: 100,
								unitCost: 5,
							},
						},
					];
				},
			},
		};

		const rows = await listFinanceCharges(createFinanceCtx({ db }), {
			spendCategory: "purchases",
			purchasePurpose: "SCHOOL_USE",
			unpaidOnly: true,
		});

		expect(where.status).toEqual({ in: ["PENDING", "PARTIALLY_PAID"] });
		expect(where.AND).toEqual([
			buildSpendCategoryWhere("purchases", "SCHOOL_USE"),
		]);
		expect(rows[0]?.purchase).toEqual({
			id: "purchase-1",
			kind: "PURCHASE",
			purpose: "SCHOOL_USE",
			quantity: 100,
			unitCost: 5,
		});
	});
});

describe("payFinanceStaffCharges", () => {
	function staffPayDb(charges: any[]) {
		const payments: any[] = [];
		const byId = new Map(charges.map((charge) => [charge.id, charge]));
		const db = {
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeCharge: {
						findMany: async ({ where }: any) =>
							charges.filter(
								(charge) =>
									where.id.in.includes(charge.id) &&
									charge.payerType === where.payerType,
							),
						findFirst: async ({ where }: any) => byId.get(where.id),
						update: async ({ where, data }: any) => ({
							...byId.get(where.id),
							...data,
						}),
					},
					financePayment: {
						create: async ({ data }: any) => {
							payments.push(data);
							return {
								id: `payment-${payments.length}`,
								paymentDate: data.paymentDate,
								...data,
							};
						},
					},
					financePaymentAllocation: {
						create: async ({ data }: any) => ({ id: "allocation", ...data }),
					},
					financeLedgerEntry: {
						create: async ({ data }: any) => ({ id: "ledger", ...data }),
					},
					schoolInventory: { findFirst: async () => null },
					inventoryIssuance: { create: async () => undefined },
				}),
		};
		return { db, payments };
	}
	const salary = (id: string, amount: number, amountPaid = 0) => ({
		id,
		schoolProfileId: "school-1",
		streamId: "stream-salary",
		payerType: "STAFF",
		studentId: null,
		staffProfileId: `staff-${id}`,
		title: "October salary",
		amount,
		amountPaid,
		status: amountPaid ? "PARTIALLY_PAID" : "PENDING",
		collectionStatus: "NOT_REQUIRED",
		schoolSessionId: "session-1",
		sessionTermId: "term-1",
		stream: { id: "stream-salary", accountType: "DEBIT" },
	});

	test("pays the outstanding amount of every selected salary", async () => {
		const { db, payments } = staffPayDb([
			salary("a", 145000),
			salary("b", 65000, 15000),
		]);

		const result = await payFinanceStaffCharges(createFinanceCtx({ db }), {
			chargeIds: ["a", "b", "a"],
			method: "Bank Transfer",
		});

		expect(result).toMatchObject({ success: true, count: 2, total: 195000 });
		expect(payments.map((payment) => Number(payment.amount))).toEqual([
			145000, 50000,
		]);
		expect(payments[0]).toMatchObject({
			streamId: "stream-salary",
			method: "Bank Transfer",
		});
	});

	test("rejects charges that are not staff pay", async () => {
		const { db } = staffPayDb([{ ...salary("a", 1000), payerType: "SCHOOL" }]);

		await expect(
			payFinanceStaffCharges(createFinanceCtx({ db }), { chargeIds: ["a"] }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);
	});

	test("rejects non-finance roles", async () => {
		await expect(
			payFinanceStaffCharges(createFinanceCtx({ role: "Teacher", db: {} }), {
				chargeIds: ["a"],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
	});
});

describe("getFinanceHomeSummary", () => {
	test("totals today's collections and what is still owed each way", async () => {
		const chargeWheres: any[] = [];
		let todayWhere: any = null;
		const sums: Record<string, { amount: number; amountPaid: number; count: number }> = {
			STUDENT: { amount: 300000, amountPaid: 120000, count: 4 },
			SCHOOL: { amount: 488000, amountPaid: 0, count: 3 },
			STAFF: { amount: 647000, amountPaid: 0, count: 6 },
		};
		const db = {
			financePayment: {
				aggregate: async ({ where }: any) => {
					todayWhere = where;
					return { _sum: { amount: 172000 }, _count: { _all: 2 } };
				},
				findMany: async () => [
					{
						id: "pay-1",
						amount: 85000,
						payerType: "STUDENT",
						paymentDate: new Date("2026-10-17T09:00:00"),
						stream: { name: "School Fees" },
						student: { name: "Fatima", surname: "Sani", otherName: null },
						staffProfile: null,
						payee: null,
						allocations: [{ charge: { title: "2nd Term School Fees" } }],
					},
				],
			},
			financeCharge: {
				aggregate: async ({ where }: any) => {
					chargeWheres.push(where);
					const row = sums[where.payerType] ?? { amount: 0, amountPaid: 0, count: 0 };
					return {
						_sum: { amount: row.amount, amountPaid: row.amountPaid },
						_count: { _all: row.count },
					};
				},
				groupBy: async () => [{ studentId: "s1" }, { studentId: "s2" }],
			},
		};

		const summary = await getFinanceHomeSummary(
			createFinanceCtx({ role: "Accountant", db }),
			{ now: new Date("2026-10-17T15:30:00") },
		);

		expect(todayWhere.paymentDate.gte).toEqual(new Date("2026-10-17T00:00:00"));
		expect(chargeWheres.every((where) => where.status.in.includes("PENDING"))).toBe(true);
		expect(summary).toMatchObject({
			collectedToday: { amount: 172000, count: 2 },
			studentsOwe: { amount: 180000, count: 2 },
			billsToPay: { amount: 488000, count: 3 },
			salariesDue: { amount: 647000, count: 6 },
		});
		expect(summary.recent[0]).toMatchObject({
			amount: 85000,
			account: "School Fees",
			what: "2nd Term School Fees",
		});
	});
});

describe("recordFinancePurchase account guard", () => {
	test("rejects paying from a money-in account", async () => {
		const db = {
			financeTermLedgerClose: { findFirst: async () => null },
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async () => ({
							id: "stream-fees",
							name: "Tuition Fee",
							accountType: "CREDIT",
						}),
					},
				}),
		};

		await expect(
			recordFinancePurchase(createFinanceCtx({ db }), {
				kind: "PURCHASE",
				purpose: "RESALE",
				streamId: "stream-fees",
				title: "Uniform sets",
				quantity: 2,
				unitCost: 250,
				amountPaid: 500,
			} as any),
		).rejects.toThrow("Tuition Fee is a money-in account");
	});
});

describe("salary runs and staff pay setup", () => {
	const salaryStream = {
		id: "stream-salary",
		name: "Salary/Wages",
		accountType: "DEBIT",
	};

	function structure(overrides: Record<string, unknown>) {
		return {
			schoolProfileId: "school-1",
			deletedAt: null,
			isActive: true,
			streamId: salaryStream.id,
			stream: salaryStream,
			schoolSessionId: "session-0",
			sessionTermId: "term-0",
			notes: null,
			...overrides,
		} as any;
	}

	const structures = [
		structure({
			id: "ps-amina",
			staffProfileId: "staff-amina",
			staffProfile: { id: "staff-amina", name: "Amina", title: "Teacher" },
			title: "Teacher pay",
			cadence: "MONTHLY",
			netAmount: 80000,
		}),
		structure({
			id: "ps-bello",
			staffProfileId: "staff-bello",
			staffProfile: { id: "staff-bello", name: "Bello", title: "Teacher" },
			title: "Teacher pay",
			cadence: "MONTHLY",
			netAmount: 70000,
		}),
		structure({
			id: "ps-chidi",
			staffProfileId: "staff-chidi",
			staffProfile: { id: "staff-chidi", name: "Chidi", title: "Cleaner" },
			title: "Cleaner pay",
			cadence: "DAILY",
			netAmount: 3000,
		}),
		structure({
			id: "ps-dayo",
			staffProfileId: "staff-dayo",
			staffProfile: { id: "staff-dayo", name: "Dayo", title: "Coach" },
			title: "Coach pay",
			cadence: "TERM",
			netAmount: 150000,
		}),
		structure({
			id: "ps-efe",
			staffProfileId: "staff-efe",
			staffProfile: { id: "staff-efe", name: "Efe", title: "Electrician" },
			title: "Repairs",
			cadence: "TASK",
			netAmount: 10000,
		}),
	];

	function salaryRunDb({
		existingCharges = [],
		closedTerm = false,
	}: { existingCharges?: any[]; closedTerm?: boolean } = {}) {
		const created: any[] = [];
		const chargeQueries: any[] = [];
		const byId = new Map(structures.map((row) => [row.id, row]));
		const db = {
			financePayrollStructure: {
				findMany: async ({ where }: any) =>
					structures.filter(
						(row) =>
							row.schoolProfileId === where.schoolProfileId &&
							(!where.id?.in || where.id.in.includes(row.id)) &&
							(where.isActive === undefined || row.isActive === where.isActive),
					),
				findFirst: async ({ where }: any) => byId.get(where.id) ?? null,
			},
			financeCharge: {
				findMany: async ({ where }: any) => {
					chargeQueries.push(where);
					return existingCharges.filter((charge) => {
						if (!where.payrollStructureId.in.includes(charge.payrollStructureId)) {
							return false;
						}
						if (where.dueDate === null) {
							return (
								charge.dueDate === null &&
								charge.sessionTermId === where.sessionTermId
							);
						}
						return (
							charge.dueDate >= where.dueDate.gte &&
							charge.dueDate < where.dueDate.lt
						);
					});
				},
			},
			sessionTerm: {
				findFirst: async ({ where }: any) =>
					where.id === "term-1"
						? {
								id: "term-1",
								title: "First Term",
								sessionId: "session-1",
								session: { title: "2026/2027" },
							}
						: null,
			},
			financeTermLedgerClose: {
				findFirst: async () => (closedTerm ? { id: "close-1" } : null),
			},
			$transaction: async (fn: (tx: any) => unknown) =>
				fn({
					financeStream: {
						findFirst: async ({ where }: any) =>
							where.id === salaryStream.id ? salaryStream : null,
					},
					financeCharge: {
						create: async ({ data }: any) => {
							const charge = { id: `charge-${created.length + 1}`, ...data };
							created.push(charge);
							return charge;
						},
					},
				}),
		};
		return { db, created, chargeQueries };
	}

	test("month bounds end on the month's last day", () => {
		const bounds = monthPeriodBounds("2028-02");
		expect(bounds.start.toISOString()).toBe("2028-02-01T00:00:00.000Z");
		expect(bounds.end.toISOString()).toBe("2028-03-01T00:00:00.000Z");
		expect(bounds.dueDate.toISOString()).toBe("2028-02-29T00:00:00.000Z");
		expect(bounds.label).toBe("February 2028");
	});

	test("previews a month run: monthly and daily staff, already-charged staff flagged", async () => {
		const { db, chargeQueries } = salaryRunDb({
			existingCharges: [
				{
					id: "charge-old",
					payrollStructureId: "ps-amina",
					dueDate: new Date(Date.UTC(2026, 9, 31)),
					sessionTermId: "term-1",
				},
				// September's salary does not count for October.
				{
					id: "charge-sept",
					payrollStructureId: "ps-bello",
					dueDate: new Date(Date.UTC(2026, 8, 30)),
					sessionTermId: "term-1",
				},
			],
		});

		const preview = await getFinanceSalaryRunPreview(
			createFinanceCtx({ db, role: "Accountant", termId: "term-1" }),
			{ period: { kind: "MONTH", month: "2026-10" } },
		);

		expect(preview.period).toMatchObject({ kind: "MONTH", label: "October 2026" });
		expect(preview.rows.map((row) => row.payrollStructureId)).toEqual([
			"ps-amina",
			"ps-bello",
			"ps-chidi",
		]);
		expect(preview.rows[0]?.chargedChargeId).toBe("charge-old");
		expect(preview.rows[2]?.perUnit).toBe(true);
		expect(preview.perTaskRows.map((row) => row.payrollStructureId)).toEqual([
			"ps-efe",
		]);
		expect(preview.summary).toEqual({
			readyCount: 1,
			readyTotal: 70000,
			perUnitCount: 1,
			alreadyChargedCount: 1,
		});
		expect(chargeQueries[0]).toMatchObject({
			status: { not: "CANCELLED" },
			dueDate: {
				gte: new Date(Date.UTC(2026, 9, 1)),
				lt: new Date(Date.UTC(2026, 10, 1)),
			},
		});
	});

	test("creates month salaries, multiplies daily rates and skips staff already charged", async () => {
		const { db, created } = salaryRunDb({
			existingCharges: [
				{
					id: "charge-old",
					payrollStructureId: "ps-amina",
					dueDate: new Date(Date.UTC(2026, 9, 31)),
					sessionTermId: "term-1",
				},
			],
		});

		const result = await createFinanceSalaryRun(
			createFinanceCtx({ db, termId: "term-1", sessionId: "session-1" }),
			{
				period: { kind: "MONTH", month: "2026-10" },
				lines: [
					{ payrollStructureId: "ps-amina" },
					{ payrollStructureId: "ps-bello" },
					{ payrollStructureId: "ps-chidi", units: 12 },
				],
			},
		);

		expect(result.count).toBe(2);
		expect(result.total).toBe(70000 + 36000);
		expect(result.skipped).toEqual([
			{
				payrollStructureId: "ps-amina",
				staffName: "Amina",
				reason: "Already has a salary for October 2026",
			},
		]);
		expect(created[0]).toMatchObject({
			payerType: "STAFF",
			staffProfileId: "staff-bello",
			payrollStructureId: "ps-bello",
			streamId: "stream-salary",
			title: "Teacher pay · October 2026",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
			dueDate: new Date(Date.UTC(2026, 9, 31)),
		});
		expect(created[1]).toMatchObject({
			staffProfileId: "staff-chidi",
			description: "12 days × 3,000",
		});
		expect(Number(created[1].amount)).toBe(36000);
	});

	test("rejects a run before writing when a line is invalid", async () => {
		const missingUnits = salaryRunDb();
		await expect(
			createFinanceSalaryRun(createFinanceCtx({ db: missingUnits.db }), {
				period: { kind: "MONTH", month: "2026-10" },
				lines: [{ payrollStructureId: "ps-bello" }, { payrollStructureId: "ps-chidi" }],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Enter the days Chidi worked." });
		expect(missingUnits.created).toHaveLength(0);

		const wrongCadence = salaryRunDb();
		await expect(
			createFinanceSalaryRun(createFinanceCtx({ db: wrongCadence.db }), {
				period: { kind: "MONTH", month: "2026-10" },
				lines: [{ payrollStructureId: "ps-bello" }, { payrollStructureId: "ps-dayo" }],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(wrongCadence.created).toHaveLength(0);
	});

	test("blocks salary runs into a closed term", async () => {
		const { db, created } = salaryRunDb({ closedTerm: true });
		await expect(
			createFinanceSalaryRun(createFinanceCtx({ db, termId: "term-1" }), {
				period: { kind: "MONTH", month: "2026-10" },
				lines: [{ payrollStructureId: "ps-bello" }],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(created).toHaveLength(0);
	});

	test("term runs charge term staff once per term with no due date", async () => {
		const { db, created } = salaryRunDb({
			existingCharges: [
				// A month-run charge in the same term does not block the term run.
				{
					id: "charge-month",
					payrollStructureId: "ps-chidi",
					dueDate: new Date(Date.UTC(2026, 9, 31)),
					sessionTermId: "term-1",
				},
			],
		});
		const ctx = createFinanceCtx({ db, termId: "term-1" });

		const preview = await getFinanceSalaryRunPreview(ctx, {
			period: { kind: "TERM", termId: null },
		});
		expect(preview.period.label).toBe("First Term 2026/2027");
		expect(preview.rows.map((row) => row.payrollStructureId)).toEqual([
			"ps-chidi",
			"ps-dayo",
		]);
		expect(preview.rows.every((row) => row.chargedChargeId === null)).toBe(true);

		const result = await createFinanceSalaryRun(ctx, {
			period: { kind: "TERM", termId: "term-1" },
			lines: [{ payrollStructureId: "ps-dayo" }],
		});
		expect(result.count).toBe(1);
		expect(created[0]).toMatchObject({
			title: "Coach pay · First Term 2026/2027",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
			dueDate: null,
		});
	});

	test("one-off pay defaults to the current term and refuses money-in accounts", async () => {
		const { db, created } = salaryRunDb();
		await createFinancePayrollObligation(
			createFinanceCtx({ db, termId: "term-1", sessionId: "session-1" }),
			{
				payrollStructureId: "ps-efe",
				title: null,
				description: "Fixed the generator",
				amount: 12500,
				dueDate: null,
				sessionId: null,
				termId: null,
			},
		);
		expect(created[0]).toMatchObject({
			title: "Repairs",
			description: "Fixed the generator",
			sessionTermId: "term-1",
			schoolSessionId: "session-1",
		});
		expect(Number(created[0].amount)).toBe(12500);

		const creditStructure = structure({
			id: "ps-credit",
			staffProfileId: "staff-x",
			title: "Pay",
			cadence: "ONE_OFF",
			netAmount: 100,
			stream: { id: "stream-fees", name: "School Fees", accountType: "CREDIT" },
		});
		await expect(
			createFinancePayrollObligation(
				createFinanceCtx({
					db: { financePayrollStructure: { findFirst: async () => creditStructure } },
				}),
				{ payrollStructureId: "ps-credit" } as any,
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("staff pay setup is Admin-only and pays only from expense accounts", async () => {
		const db = {
			staffProfile: { findFirst: async () => ({ id: "staff-1" }) },
			financeStream: {
				findFirst: async () => ({
					id: "stream-fees",
					name: "School Fees",
					accountType: "CREDIT",
				}),
			},
			financePayrollStructure: {
				create: async () => {
					throw new Error("should not save");
				},
			},
		};
		const input = {
			id: null,
			staffProfileId: "staff-1",
			streamId: "stream-fees",
			streamName: null,
			title: "Teacher pay",
			cadence: "MONTHLY",
			baseAmount: 1000,
		} as any;

		await expect(
			upsertFinancePayrollStructure(createFinanceCtx({ db, role: "Accountant" }), input),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			upsertFinancePayrollStructure(createFinanceCtx({ db }), input),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "School Fees is a money-in account. Pick an expense account to pay salaries from.",
		});
	});

	test("lists every staff member with their current pay setup", async () => {
		const db = {
			staffProfile: {
				findMany: async () => [
					{ id: "staff-amina", name: "Amina", title: "Teacher" },
					{ id: "staff-new", name: "Ngozi", title: null },
				],
			},
			financePayrollStructure: {
				// Already ordered active-first, newest-first by the query.
				findMany: async () => [
					structure({
						id: "ps-amina-current",
						staffProfileId: "staff-amina",
						title: "Teacher pay",
						cadence: "MONTHLY",
						baseAmount: 70000,
						allowanceAmount: 15000,
						bonusAmount: 0,
						deductionAmount: 5000,
						advanceAmount: 0,
						netAmount: 80000,
					}),
					structure({
						id: "ps-amina-old",
						staffProfileId: "staff-amina",
						isActive: false,
						title: "Old pay",
						cadence: "MONTHLY",
						baseAmount: 1,
						allowanceAmount: 0,
						bonusAmount: 0,
						deductionAmount: 0,
						advanceAmount: 0,
						netAmount: 1,
					}),
				],
			},
		};

		const rows = await listFinancePayrollSetup(createFinanceCtx({ db }));
		expect(rows).toHaveLength(2);
		expect(rows[0]?.structure).toMatchObject({
			id: "ps-amina-current",
			allowanceAmount: 15000,
			netAmount: 80000,
		});
		expect(rows[1]?.structure).toBeNull();

		await expect(
			listFinancePayrollSetup(createFinanceCtx({ db, role: "Accountant" })),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});

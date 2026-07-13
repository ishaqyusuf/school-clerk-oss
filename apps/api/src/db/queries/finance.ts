import { Prisma } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../trpc/init";
import type {
	FinanceChargeInput,
	FinanceItemInput,
	FinancePayeeHistoryInput,
	FinancePayeeInput,
	FinancePayeeQuery,
	FinancePaymentInput,
	FinancePayrollObligationInput,
	FinancePayrollStructureInput,
	FinanceProjectAccountSummaryInput,
	FinancePurchaseCancellationInput,
	FinancePurchaseInput,
	FinanceReceivePaymentOptionsInput,
	FinanceSimpleStudentPaymentInput,
	FinanceStaffHistoryInput,
	FinanceTermAccountStatementInput,
	FinanceTermCloseInput,
	FinanceStreamDetailsInput,
	FinanceStreamInput,
	FinanceStreamQuery,
	FinanceTermLedgerQuery,
	FinanceTransferInput,
} from "../../trpc/schemas/finance";

type FinanceDb = Pick<TRPCContext["db"], "financeStream">;
type StudentTermFormDb = Pick<TRPCContext["db"], "studentTermForm">;
type StudentChargeReconciliationDb = Pick<
	TRPCContext["db"],
	"$executeRaw" | "financeCharge" | "financeItem"
>;

function requireSchoolId(ctx: TRPCContext) {
	const schoolId = ctx.profile.schoolId;
	if (!schoolId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "School context is required for finance operations.",
		});
	}
	return schoolId;
}

function toMoney(value: number | string | Prisma.Decimal) {
	return new Prisma.Decimal(value);
}

function toNumber(value: number | string | Prisma.Decimal | null | undefined) {
	if (value == null) return 0;
	return Number(value);
}

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function streamDefaults(type?: string | null) {
	switch (type) {
		case "TUITION_FEE":
			return { name: "Tuition Fee", accountType: "CREDIT" as const };
		case "BOOK":
			return { name: "Book", accountType: "CREDIT" as const };
		case "SERVICE":
			return { name: "Services", accountType: "DEBIT" as const };
		case "SALARY":
			return { name: "Salary", accountType: "DEBIT" as const };
		default:
			return { name: "Miscellaneous", accountType: "CREDIT" as const };
	}
}

function legacyStreamType(accountType: "CREDIT" | "DEBIT") {
	return accountType === "CREDIT" ? "incoming" : "outgoing";
}

function studentDisplayName(
	student?: {
		name?: string | null;
		surname?: string | null;
		otherName?: string | null;
	} | null,
) {
	return [student?.surname, student?.name, student?.otherName]
		.filter(Boolean)
		.join(" ");
}

type StudentTermChargeForm = {
	id: string;
	studentId: string | null;
	sessionTermId: string | null;
	schoolSessionId: string | null;
	classroomDepartmentId: string | null;
};

const FINANCE_READ_ROLES = new Set(["ADMIN", "Admin", "Accountant"]);
const LARGE_FINANCE_ACTION_THRESHOLD = 250_000;

export function requireFinanceReadAccess(ctx: TRPCContext) {
	const role = ctx.currentUser?.role;
	if (!role || !FINANCE_READ_ROLES.has(role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to view finance records.",
		});
	}
}

function financePermissionFlags(ctx: TRPCContext) {
	const role = ctx.currentUser?.role;
	const isAdmin = isFinanceAdmin(ctx);
	const isFinanceOperator = isAdmin || role === "Accountant";

	return {
		canReceivePayment: isFinanceOperator,
		canCreateSimpleCollection: isAdmin,
		canCreateSchoolFee: isAdmin,
		canCreateReusableDescription: isAdmin,
		canCreateOneOffManualCharge: isFinanceOperator,
	};
}

function normalizeOptionTitle(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePayeeName(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isFinanceAdmin(ctx: TRPCContext) {
	const role = ctx.currentUser?.role;
	return role === "ADMIN" || role === "Admin";
}

export function requireFinanceWriteAccess(ctx: TRPCContext) {
	const role = ctx.currentUser?.role;
	if (!role || !FINANCE_READ_ROLES.has(role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to update finance records.",
		});
	}
}

export function requireFinanceAdmin(ctx: TRPCContext, message: string) {
	if (!isFinanceAdmin(ctx)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message,
		});
	}
}

async function lockStudentTermChargeReconciliation(
	tx: Pick<TRPCContext["db"], "$executeRaw">,
	params: {
		schoolProfileId: string;
		studentTermFormId: string;
	},
) {
	await tx.$executeRaw`
		SELECT pg_advisory_xact_lock(
			hashtext(${params.schoolProfileId}),
			hashtext(${params.studentTermFormId})
		)
	`;
}

async function getOrCreateStream(
	db: FinanceDb,
	params: {
		schoolProfileId: string;
		streamId?: string | null;
		streamName?: string | null;
		accountType?: "CREDIT" | "DEBIT";
		type?: string | null;
	},
) {
	if (params.streamId) {
		const stream = await db.financeStream.findFirst({
			where: {
				id: params.streamId,
				schoolProfileId: params.schoolProfileId,
			},
		});

		if (!stream) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance stream was not found.",
			});
		}

		return stream;
	}

	const defaults = streamDefaults(params.type);
	const name = params.streamName?.trim() || defaults.name;
	const slug = slugify(name);

	const existing = await db.financeStream.findFirst({
		where: {
			schoolProfileId: params.schoolProfileId,
			slug,
		},
	});

	if (existing) return existing;

	return db.financeStream.create({
		data: {
			schoolProfileId: params.schoolProfileId,
			name,
			slug,
			accountType: params.accountType ?? defaults.accountType,
			isSystem: true,
		},
	});
}

async function assertTermLedgerWritable(
	db: any,
	params: {
		schoolProfileId: string;
		termId?: string | null;
	},
) {
	if (!params.termId || !db.financeTermLedgerClose?.findFirst) return;

	const closedLedger = await db.financeTermLedgerClose.findFirst({
		where: {
			schoolProfileId: params.schoolProfileId,
			sessionTermId: params.termId,
			status: "CLOSED",
			deletedAt: null,
		},
		select: { id: true },
	});

	if (closedLedger) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This term ledger is closed. Reopen it before recording changes.",
		});
	}
}

async function reconcileStudentTermChargesForForm(
	tx: StudentChargeReconciliationDb,
	params: {
		schoolProfileId: string;
		createdById?: string | null;
		termForm: StudentTermChargeForm;
	},
) {
	const { schoolProfileId, termForm } = params;
	if (!termForm.studentId || !termForm.sessionTermId) {
		return { created: 0, updated: 0, cancelled: 0 };
	}

	await lockStudentTermChargeReconciliation(tx, {
		schoolProfileId,
		studentTermFormId: termForm.id,
	});

	const classApplicability: Prisma.FinanceItemWhereInput[] = [
		{
			applicableClasses: {
				none: {
					deletedAt: null,
				},
			},
		},
	];

	if (termForm.classroomDepartmentId) {
		classApplicability.push({
			applicableClasses: {
				some: {
					deletedAt: null,
					classRoomDepartmentId: termForm.classroomDepartmentId,
				},
			},
		});
	}

	const applicableItems = await tx.financeItem.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			isActive: true,
			collectable: true,
			OR: [
				{ sessionTermId: termForm.sessionTermId },
				{ sessionTermId: null },
			],
			AND: [
				{
					OR: [
						{ schoolSessionId: termForm.schoolSessionId },
						{ schoolSessionId: null },
					],
				},
				{ OR: classApplicability },
			],
		},
		orderBy: [{ type: "asc" }, { name: "asc" }],
	});

	const existingCharges = await tx.financeCharge.findMany({
		where: {
			schoolProfileId,
			payerType: "STUDENT",
			studentId: termForm.studentId,
			deletedAt: null,
			status: { not: "CANCELLED" },
			OR: [
				{ studentTermFormId: termForm.id },
				{
					studentTermFormId: null,
					sessionTermId: termForm.sessionTermId,
				},
			],
		},
		orderBy: [{ createdAt: "asc" }],
	});

	const applicableItemIds = new Set(applicableItems.map((item) => item.id));
	const chargesByItemId = new Map<string, typeof existingCharges>();

	for (const charge of existingCharges) {
		if (!charge.itemId) continue;

		chargesByItemId.set(charge.itemId, [
			...(chargesByItemId.get(charge.itemId) ?? []),
			charge,
		]);
	}

	let created = 0;
	let updated = 0;
	let cancelled = 0;

	for (const item of applicableItems) {
		const charges = chargesByItemId.get(item.id) ?? [];
		const primary =
			charges.find((charge) => toNumber(charge.amountPaid) > 0) ?? charges[0];

		if (!primary) {
			await tx.financeCharge.create({
				data: {
					schoolProfileId,
					streamId: item.streamId,
					itemId: item.id,
					payerType: "STUDENT",
					studentId: termForm.studentId,
					studentTermFormId: termForm.id,
					classroomDepartmentId: termForm.classroomDepartmentId,
					schoolSessionId: termForm.schoolSessionId,
					sessionTermId: termForm.sessionTermId,
					title: item.name,
					description: item.description,
					amount: item.amount,
					collectionStatus: "NOT_COLLECTED",
					createdById: params.createdById,
				},
			});
			created++;
			continue;
		}

		const primaryPaidAmount = toNumber(primary.amountPaid);
		if (primaryPaidAmount <= 0) {
			await tx.financeCharge.update({
				where: { id: primary.id },
				data: {
					streamId: item.streamId,
					studentTermFormId: termForm.id,
					classroomDepartmentId: termForm.classroomDepartmentId,
					schoolSessionId: termForm.schoolSessionId,
					sessionTermId: termForm.sessionTermId,
					title: item.name,
					description: item.description,
					amount: item.amount,
					collectionStatus: "NOT_COLLECTED",
					status: "PENDING",
					cancelledAt: null,
					cancellationReason: null,
				},
			});
			updated++;
		}

		const duplicateIds = charges
			.filter((charge) => charge.id !== primary.id && toNumber(charge.amountPaid) <= 0)
			.map((charge) => charge.id);

		if (duplicateIds.length) {
			const result = await tx.financeCharge.updateMany({
				where: { id: { in: duplicateIds } },
				data: {
					status: "CANCELLED",
					collectionStatus: "NOT_REQUIRED",
					cancelledAt: new Date(),
					cancellationReason: "Duplicate charge removed during fee reconciliation.",
				},
			});
			cancelled += result.count;
		}
	}

	const staleChargeIds = existingCharges
		.filter(
			(charge) =>
				charge.itemId &&
				!applicableItemIds.has(charge.itemId) &&
				toNumber(charge.amountPaid) <= 0,
		)
		.map((charge) => charge.id);

	if (staleChargeIds.length) {
		const result = await tx.financeCharge.updateMany({
			where: { id: { in: staleChargeIds } },
			data: {
				status: "CANCELLED",
				collectionStatus: "NOT_REQUIRED",
				cancelledAt: new Date(),
				cancellationReason: "Fee is no longer applicable to this student term.",
			},
		});
		cancelled += result.count;
	}

	return { created, updated, cancelled };
}

async function findStudentTermFormForFinance(
	tx: StudentTermFormDb,
	params: {
		schoolProfileId: string;
		studentId: string;
		termId?: string | null;
		sessionId?: string | null;
	},
) {
	return tx.studentTermForm.findFirst({
		where: {
			schoolProfileId: params.schoolProfileId,
			studentId: params.studentId,
			deletedAt: null,
			...(params.termId ? { sessionTermId: params.termId } : {}),
			...(params.sessionId ? { schoolSessionId: params.sessionId } : {}),
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			studentId: true,
			sessionTermId: true,
			schoolSessionId: true,
			classroomDepartmentId: true,
		},
	});
}

async function reconcileStudentTermCharges(
	ctx: TRPCContext,
	input: {
		studentId: string;
		termId?: string | null;
		sessionId?: string | null;
	},
) {
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.$transaction(async (tx) => {
		const termForm = await findStudentTermFormForFinance(tx, {
			schoolProfileId,
			studentId: input.studentId,
			termId: input.termId,
			sessionId: input.sessionId,
		});

		if (!termForm) return { created: 0, updated: 0, cancelled: 0 };

		return reconcileStudentTermChargesForForm(tx, {
			schoolProfileId,
			createdById: ctx.currentUser?.id,
			termForm,
		});
	});
}

async function reconcileClassroomTermCharges(
	ctx: TRPCContext,
	input: {
		classroomDepartmentId: string;
		termId?: string | null;
		sessionId?: string | null;
	},
) {
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.$transaction(async (tx) => {
		const termForms = await tx.studentTermForm.findMany({
			where: {
				schoolProfileId,
				deletedAt: null,
				classroomDepartmentId: input.classroomDepartmentId,
				studentId: { not: null },
				...(input.termId ? { sessionTermId: input.termId } : {}),
				...(input.sessionId ? { schoolSessionId: input.sessionId } : {}),
			},
			select: {
				id: true,
				studentId: true,
				sessionTermId: true,
				schoolSessionId: true,
				classroomDepartmentId: true,
			},
		});

		const result = { created: 0, updated: 0, cancelled: 0 };
		for (const termForm of termForms) {
			const next = await reconcileStudentTermChargesForForm(tx, {
				schoolProfileId,
				createdById: ctx.currentUser?.id,
				termForm,
			});
			result.created += next.created;
			result.updated += next.updated;
			result.cancelled += next.cancelled;
		}

		return result;
	});
}

function ledgerDirectionForStream(accountType: "CREDIT" | "DEBIT") {
	return accountType === "DEBIT" ? "DEBIT" : "CREDIT";
}

function summarizeLedger(
	entries: Array<{ direction: "CREDIT" | "DEBIT"; amount: Prisma.Decimal }>,
) {
	const credit = entries
		.filter((entry) => entry.direction === "CREDIT")
		.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
	const debit = entries
		.filter((entry) => entry.direction === "DEBIT")
		.reduce((sum, entry) => sum + toNumber(entry.amount), 0);

	return {
		credit,
		debit,
		balance: credit - debit,
	};
}

export async function listFinanceStreams(
	ctx: TRPCContext,
	input?: FinanceStreamQuery,
) {
	const schoolProfileId = requireSchoolId(ctx);
	const ledgerEntryTermFilters: Prisma.FinanceLedgerEntryWhereInput[] = [
		...(input?.termId
			? [
					{
						OR: [
							{ collectedSessionTermId: input.termId },
							{
								collectedSessionTermId: null,
								charge: { sessionTermId: input.termId },
							},
						],
					},
				]
			: []),
		...(input?.sessionId
			? [
					{
						OR: [
							{ collectedSchoolSessionId: input.sessionId },
							{
								collectedSchoolSessionId: null,
								charge: { schoolSessionId: input.sessionId },
							},
						],
					},
				]
			: []),
	];
	const streams = await ctx.db.financeStream.findMany({
		where: { schoolProfileId },
		include: {
			ledgerEntries: {
				where: ledgerEntryTermFilters.length
					? { AND: ledgerEntryTermFilters }
					: {},
				select: { direction: true, amount: true },
			},
			_count: {
				select: {
					charges: true,
					payments: true,
					incomingTransfers: true,
					outgoingTransfers: true,
				},
			},
		},
		orderBy: [{ isSystem: "desc" }, { name: "asc" }],
	});

	return streams.map((stream) => {
		const summary = summarizeLedger(stream.ledgerEntries);
		const type = legacyStreamType(stream.accountType);

		return {
			id: stream.id,
			name: stream.name,
			slug: stream.slug,
			accountType: stream.accountType,
			type,
			defaultType: type,
			description: stream.description,
			isSystem: stream.isSystem,
			...summary,
			totalIn: summary.credit,
			totalOut: summary.debit,
			projectedBalance: summary.balance,
			pendingBills: 0,
			pendingBillsCount: 0,
			activeBillables: stream._count.charges,
			activeBillablesCount: stream._count.charges,
			owingAmount: 0,
			counts: stream._count,
		};
	});
}

export async function getFinanceStreamDetails(
	ctx: TRPCContext,
	input: FinanceStreamDetailsInput,
) {
	const schoolProfileId = requireSchoolId(ctx);
	const stream = await ctx.db.financeStream.findFirst({
		where: { id: input.streamId, schoolProfileId },
		include: {
			ledgerEntries: {
				include: {
					charge: {
						select: {
							id: true,
							title: true,
							payerType: true,
							status: true,
						},
					},
					payment: {
						select: {
							id: true,
							reference: true,
							method: true,
							status: true,
						},
					},
					transfer: {
						select: {
							id: true,
							note: true,
							status: true,
							fromStreamId: true,
							toStreamId: true,
						},
					},
				},
				orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
				take: 200,
			},
			charges: {
				where: {
					...(input.termId ? { sessionTermId: input.termId } : {}),
					...(input.sessionId ? { schoolSessionId: input.sessionId } : {}),
				},
				include: {
					student: {
						select: { id: true, name: true, surname: true, otherName: true },
					},
					staffProfile: { select: { id: true, name: true, title: true } },
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { id: true, name: true } },
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: 100,
			},
		},
	});

	if (!stream) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Finance stream was not found.",
		});
	}

	const summary = summarizeLedger(stream.ledgerEntries);
	const type = legacyStreamType(stream.accountType);

	return {
		id: stream.id,
		name: stream.name,
		slug: stream.slug,
		accountType: stream.accountType,
		type,
		defaultType: type,
		description: stream.description,
		createdAt: stream.createdAt,
		periodLabel: input.termId
			? "Selected term"
			: input.sessionId
				? "Selected session"
				: "All time",
		summary,
		balance: summary.balance,
		projectedBalance: summary.balance,
		totalIn: summary.credit,
		totalOut: summary.debit,
		pendingBills: 0,
		pendingBillsCount: 0,
		activeBillables: stream.charges.length,
		activeBillablesCount: stream.charges.length,
		owingAmount: 0,
		ledgerEntries: stream.ledgerEntries.map((entry) => ({
			id: entry.id,
			direction: entry.direction,
			sourceType: entry.sourceType,
			sourceId: entry.sourceId,
			amount: toNumber(entry.amount),
			occurredAt: entry.occurredAt,
			note: entry.note,
			charge: entry.charge,
			payment: entry.payment,
			transfer: entry.transfer,
		})),
		transactions: stream.ledgerEntries.map((entry) => ({
			id: entry.id,
			type: entry.direction === "CREDIT" ? "credit" : "debit",
			amount: toNumber(entry.amount),
			status: "success",
			createdAt: entry.occurredAt,
			transactionDate: entry.occurredAt,
			description: entry.note,
		})),
		charges: stream.charges.map((charge) => ({
			...charge,
			amount: toNumber(charge.amount),
			amountPaid: toNumber(charge.amountPaid),
		})),
		records: stream.charges.map((charge) => ({
			id: charge.id,
			reference: charge.id,
			title: charge.title,
			description: charge.description,
			partyName:
				studentDisplayName(charge.student) ||
				charge.staffProfile?.name ||
				"School",
			studentClassroom: [
				charge.classroomDepartment?.classRoom?.name,
				charge.classroomDepartment?.departmentName,
			]
				.filter(Boolean)
				.join(" "),
			type: charge.payerType.toLowerCase(),
			direction: type === "incoming" ? "in" : "out",
			amount: toNumber(charge.amount),
			status: charge.status,
			createdAt: charge.createdAt,
			transactionDate: charge.createdAt,
		})),
	};
}

export async function upsertFinanceStream(
	ctx: TRPCContext,
	input: FinanceStreamInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const slug = input.slug?.trim() || slugify(input.name);

	if (input.id) {
		const existing = await ctx.db.financeStream.findFirst({
			where: { id: input.id, schoolProfileId, deletedAt: null },
			select: { id: true },
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance stream was not found.",
			});
		}

		return ctx.db.financeStream.update({
			where: { id: input.id },
			data: {
				name: input.name,
				slug,
				accountType: input.accountType,
				description: input.description,
				isSystem: input.isSystem ?? false,
			},
		});
	}

	return ctx.db.financeStream.create({
		data: {
			schoolProfileId,
			name: input.name,
			slug,
			accountType: input.accountType,
			description: input.description,
			isSystem: input.isSystem ?? false,
		},
	});
}

export async function upsertFinanceItem(
	ctx: TRPCContext,
	input: FinanceItemInput,
) {
	requireFinanceAdmin(ctx, "Only an Admin can create or update finance items.");
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.$transaction(async (tx) => {
		const stream = await getOrCreateStream(tx, {
			schoolProfileId,
			streamId: input.streamId,
			streamName: input.streamName,
			accountType: input.accountType,
			type: input.type,
		});

		const collectable = input.collectable ?? input.type === "BOOK";
		const data = {
			schoolProfileId,
			streamId: stream.id,
			type: input.type,
			name: input.name,
			description: input.description,
			amount: toMoney(input.amount),
			collectable,
			isActive: input.isActive ?? true,
			schoolSessionId: input.sessionId,
			sessionTermId: input.termId,
			createdById: ctx.currentUser?.id,
		};

		let item;
		if (input.id) {
			const existing = await tx.financeItem.findFirst({
				where: { id: input.id, schoolProfileId, deletedAt: null },
				select: { id: true },
			});
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Finance item was not found.",
				});
			}
			item = await tx.financeItem.update({ where: { id: input.id }, data });
		} else {
			item = await tx.financeItem.create({ data });
		}

		await tx.financeItemClassRoomDepartment.deleteMany({
			where: { itemId: item.id },
		});

		if (input.classRoomDepartmentIds.length) {
			await tx.financeItemClassRoomDepartment.createMany({
				data: input.classRoomDepartmentIds.map((classRoomDepartmentId) => ({
					itemId: item.id,
					classRoomDepartmentId,
				})),
				skipDuplicates: true,
			});
		}

		return item;
	});
}

export async function listFinanceItems(
	ctx: TRPCContext,
	input?: { type?: string | null; excludeType?: string | null }
) {
	const schoolProfileId = requireSchoolId(ctx);
	const items = await ctx.db.financeItem.findMany({
		where: {
			schoolProfileId,
			...(input?.type ? { type: input.type as any } : {}),
			...(input?.excludeType ? { type: { not: input.excludeType as any } } : {}),
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			applicableClasses: {
				include: {
					classRoomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
				},
			},
			_count: { select: { charges: true } },
		},
		orderBy: [{ type: "asc" }, { name: "asc" }],
	});

	return items.map((item) => ({
		id: item.id,
		streamId: item.streamId,
		stream: item.stream,
		streamName: item.stream.name,
		type: item.type,
		name: item.name,
		title: item.name,
		description: item.description,
		amount: toNumber(item.amount),
		collectable: item.collectable,
		isActive: item.isActive,
		schoolSessionId: item.schoolSessionId,
		sessionTermId: item.sessionTermId,
		chargesCount: item._count.charges,
		applicableClasses: item.applicableClasses.map((row) => ({
			id: row.classRoomDepartment.id,
			departmentName: row.classRoomDepartment.departmentName,
			className: row.classRoomDepartment.classRoom?.name ?? null,
		})),
		classroomDepartments: item.applicableClasses.map((row) => ({
			id: row.classRoomDepartment.id,
			departmentName: row.classRoomDepartment.departmentName,
			className: row.classRoomDepartment.classRoom?.name ?? null,
		})),
	}));
}

export async function createFinanceCharge(
	ctx: TRPCContext,
	input: FinanceChargeInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	await assertTermLedgerWritable(ctx.db as any, {
		schoolProfileId,
		termId: input.termId,
	});

	return ctx.db.$transaction(async (tx) => {
		const item = input.itemId
			? await tx.financeItem.findFirst({
					where: { id: input.itemId, schoolProfileId },
				})
			: null;

		if (input.itemId && !item) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance item was not found.",
			});
		}

		const stream = await getOrCreateStream(tx, {
			schoolProfileId,
			streamId: input.streamId ?? item?.streamId,
			streamName: input.streamName,
			type: input.type ?? item?.type,
		});

		const amount = toMoney(input.amount || item?.amount || 0);
		const charge = await tx.financeCharge.create({
			data: {
				schoolProfileId,
				streamId: stream.id,
				itemId: item?.id,
				payerType: input.payerType,
				studentId: input.studentId,
				studentTermFormId: input.studentTermFormId,
				staffProfileId: input.staffProfileId,
				staffTermProfileId: input.staffTermProfileId,
				payeeId: input.payeeId,
				payrollStructureId: input.payrollStructureId,
				classroomDepartmentId: input.classroomDepartmentId,
				schoolSessionId: input.sessionId ?? item?.schoolSessionId,
				sessionTermId: input.termId ?? item?.sessionTermId,
				title: input.title || item?.name || "Charge",
				description: input.description ?? item?.description,
				amount,
				collectionStatus:
					input.collectionStatus ??
					(item?.collectable ? "NOT_COLLECTED" : "NOT_REQUIRED"),
				dueDate: input.dueDate,
				createdById: ctx.currentUser?.id,
			},
		});

		return {
			...charge,
			amount: toNumber(charge.amount),
			amountPaid: toNumber(charge.amountPaid),
		};
	});
}

export async function listFinanceCharges(
	ctx: TRPCContext,
	input?: {
		streamId?: string | null;
		studentId?: string | null;
		staffProfileId?: string | null;
		classroomId?: string | null;
		classroomDepartmentId?: string | null;
		termId?: string | null;
		sessionId?: string | null;
		status?: string | null;
		collectionStatus?: string | null;
		payerType?: string | null;
		excludePayerType?: string | null;
		type?: string | null;
		excludeType?: string | null;
	},
) {
	const schoolProfileId = requireSchoolId(ctx);
	const classroomDepartmentId =
		input?.classroomDepartmentId ?? input?.classroomId ?? null;
	const effectiveTermId =
		input?.termId ?? (classroomDepartmentId ? ctx.profile.termId : null);
	const effectiveSessionId =
		input?.sessionId ?? (classroomDepartmentId ? ctx.profile.sessionId : null);
	const statusFromCollectionFilter =
		input?.collectionStatus === "PARTIAL"
			? "PARTIALLY_PAID"
			: input?.collectionStatus === "PENDING" ||
					input?.collectionStatus === "PAID" ||
					input?.collectionStatus === "WAIVED" ||
					input?.collectionStatus === "DRAFT"
				? input.collectionStatus
				: null;
	const collectionStatus =
		input?.collectionStatus === "NOT_REQUIRED" ||
		input?.collectionStatus === "NOT_COLLECTED" ||
		input?.collectionStatus === "COLLECTED"
			? input.collectionStatus
			: null;

	if (classroomDepartmentId && !input?.studentId && !input?.staffProfileId) {
		await reconcileClassroomTermCharges(ctx, {
			classroomDepartmentId,
			termId: effectiveTermId,
			sessionId: effectiveSessionId,
		});
	}

	const charges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			...(input?.streamId ? { streamId: input.streamId } : {}),
			...(input?.studentId ? { studentId: input.studentId } : {}),
			...(input?.staffProfileId
				? { staffProfileId: input.staffProfileId }
				: {}),
			...(classroomDepartmentId ? { classroomDepartmentId } : {}),
			...(effectiveTermId ? { sessionTermId: effectiveTermId } : {}),
			...(effectiveSessionId ? { schoolSessionId: effectiveSessionId } : {}),
			...(input?.status || statusFromCollectionFilter
				? { status: (input?.status ?? statusFromCollectionFilter) as never }
				: { status: { not: "CANCELLED" } }),
			...(collectionStatus ? { collectionStatus: collectionStatus as never } : {}),
			...(input?.payerType ? { payerType: input.payerType as any } : {}),
			...(!input?.payerType && input?.excludePayerType
				? { payerType: { not: input.excludePayerType as any } }
				: {}),
			...(input?.type
				? { item: { is: { type: input.type as any } } }
				: input?.excludeType
					? {
							OR: [
								{ item: null },
								{ item: { is: { type: { not: input.excludeType as any } } } },
							],
						}
					: {}),
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			item: { select: { id: true, type: true, name: true } },
			student: {
				select: { id: true, name: true, surname: true, otherName: true },
			},
			staffProfile: { select: { id: true, name: true, title: true } },
			staffTermProfile: {
				select: {
					id: true,
					staffProfile: { select: { id: true, name: true, title: true } },
				},
			},
			payee: {
				select: { id: true, name: true, type: true, phone: true, email: true },
			},
			payrollStructure: {
				select: { id: true, title: true, cadence: true, netAmount: true },
			},
			classroomDepartment: {
				select: {
					id: true,
					departmentName: true,
					classRoom: { select: { id: true, name: true } },
				},
			},
		},
		orderBy: [{ createdAt: "desc" }],
		take: 300,
	});

	return charges.map((charge) => {
		const amount = toNumber(charge.amount);
		const amountPaid = toNumber(charge.amountPaid);
		const outstanding = amount - amountPaid;
		const classroomName = [
			charge.classroomDepartment?.classRoom?.name,
			charge.classroomDepartment?.departmentName,
		]
			.filter(Boolean)
			.join(" ");

		return {
			id: charge.id,
			title: charge.title,
			description: charge.description,
			amount,
			amountPaid,
			outstanding,
			totalBilled: amount,
			totalPaid: amountPaid,
			totalPending: outstanding,
			studentName: studentDisplayName(charge.student),
			classroomId: charge.classroomDepartmentId,
			classroomName,
			studentCount: charge.studentId ? 1 : 0,
			overdueCount:
				charge.dueDate && charge.dueDate < new Date() && outstanding > 0
					? 1
					: 0,
			waivedCount: charge.status === "WAIVED" ? 1 : 0,
			collectionRate: amount > 0 ? Math.round((amountPaid / amount) * 100) : 0,
			studentTermFormId: charge.studentTermFormId,
			staffTermProfileId: charge.staffTermProfileId,
			staffTermProfile: charge.staffTermProfile,
			payeeId: charge.payeeId,
			payee: charge.payee,
			payrollStructureId: charge.payrollStructureId,
			payrollStructure: charge.payrollStructure
				? {
						...charge.payrollStructure,
						netAmount: toNumber(charge.payrollStructure.netAmount),
					}
				: null,
			walletId: charge.streamId,
			billPaymentId: null,
			billPayment: null,
			fees: [],
			status: charge.status,
			collectionStatus: charge.collectionStatus,
			payerType: charge.payerType,
			itemType: charge.item?.type ?? null,
			itemName: charge.item?.name ?? null,
			stream: charge.stream,
			student: charge.student,
			staffProfile: charge.staffProfile,
			createdAt: charge.createdAt,
		};
	});
}

export async function recordFinancePayment(
	ctx: TRPCContext,
	input: FinancePaymentInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.$transaction(async (tx) => {
		const charge = await tx.financeCharge.findFirst({
			where: { id: input.chargeId, schoolProfileId },
			include: { stream: true },
		});

		if (!charge) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance charge was not found.",
			});
		}

		if (charge.status === "CANCELLED" || charge.status === "WAIVED") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Cancelled or waived charges cannot receive payments.",
			});
		}

		const amount = toMoney(input.amount);
		const currentPaid = toMoney(charge.amountPaid ?? 0);
		const totalPaid = currentPaid.plus(amount);
		const chargeAmount = toMoney(charge.amount);
		const nextStatus = totalPaid.greaterThanOrEqualTo(chargeAmount)
			? "PAID"
			: "PARTIALLY_PAID";
		const collectedSessionTermId =
			input.collectedTermId ?? ctx.profile.termId ?? charge.sessionTermId ?? null;
		const collectedSchoolSessionId =
			input.collectedSessionId ??
			(input.collectedTermId ? null : ctx.profile.sessionId ?? null) ??
			charge.schoolSessionId ??
			null;
		await assertTermLedgerWritable(tx as any, {
			schoolProfileId,
			termId: collectedSessionTermId,
		});

		const payment = await tx.financePayment.create({
			data: {
				schoolProfileId,
				streamId: charge.streamId,
				payerType: charge.payerType,
				studentId: charge.studentId,
			staffProfileId: charge.staffProfileId,
			payeeId: charge.payeeId,
			amount,
				paymentDate: input.paymentDate ?? new Date(),
				collectedSessionTermId,
				collectedSchoolSessionId,
				method: input.method,
				reference: input.reference,
				note: input.note,
				receivedById: input.receivedById ?? ctx.currentUser?.id,
			},
		});

		const allocation = await tx.financePaymentAllocation.create({
			data: {
				paymentId: payment.id,
				chargeId: charge.id,
				amount,
			},
		});

		let nextCollectionStatus = charge.collectionStatus;
		if (nextStatus === "PAID" && charge.collectionStatus === "NOT_COLLECTED") {
			nextCollectionStatus = "COLLECTED";

			// Try to deduct inventory if it's an inventory-related charge
			if (charge.title) {
				const inventory = tx.inventory as any;
				const inventoryItem = await inventory.findFirst({
					where: {
						schoolProfileId,
						title: { equals: charge.title, mode: "insensitive" },
					},
				});

				if (inventoryItem) {
					await inventory.update({
						where: { id: inventoryItem.id },
						data: { quantity: { decrement: 1 } },
					});

					await tx.inventoryIssuance.create({
						data: {
							schoolProfileId,
							inventoryId: inventoryItem.id,
							quantity: 1,
							note: `Issued upon payment of charge ${charge.id}`,
							issuedTo: charge.studentId ? `studentId:${charge.studentId}` : charge.staffProfileId ? `staffId:${charge.staffProfileId}` : undefined,
							issuedDate: input.paymentDate ?? new Date(),
						},
					});
				}
			}
		}

		await tx.financeCharge.update({
			where: { id: charge.id },
			data: {
				amountPaid: totalPaid,
				status: nextStatus,
				collectionStatus: nextCollectionStatus,
			},
		});

		const direction = ledgerDirectionForStream(charge.stream.accountType);
		await tx.financeLedgerEntry.create({
			data: {
				schoolProfileId,
				streamId: charge.streamId,
				direction,
				sourceType: "PAYMENT",
				sourceId: payment.id,
				amount,
				occurredAt: payment.paymentDate,
				note: input.note ?? `Payment for ${charge.title}`,
				createdById: ctx.currentUser?.id,
				collectedSessionTermId,
				collectedSchoolSessionId,
				chargeId: charge.id,
				paymentId: payment.id,
			},
		});

		return {
			success: true,
			paymentId: payment.id,
			paymentIds: [payment.id],
			allocationId: allocation.id,
			count: 1,
			totalAllocated: toNumber(amount),
			chargeStatus: nextStatus,
		};
	});
}

export async function reverseFinancePayment(
	ctx: TRPCContext,
	input: { paymentId: string; note?: string }
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.$transaction(async (tx) => {
		const payment = await tx.financePayment.findFirst({
			where: { id: input.paymentId, schoolProfileId },
			include: { allocations: { include: { charge: true } } },
		});

		if (!payment) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found." });
		}

		if (payment.status === "CANCELLED") {
			return { success: true };
		}

		for (const allocation of payment.allocations) {
			const charge = allocation.charge;
				const amountToReverse = toMoney(allocation.amount);
				const currentPaid = toMoney(charge.amountPaid ?? 0);
				const newPaid = currentPaid.minus(amountToReverse);

				const nextStatus = newPaid.lessThanOrEqualTo(0) ? "PENDING" : "PARTIALLY_PAID";
			const nextCollectionStatus = charge.collectionStatus === "COLLECTED" ? "NOT_COLLECTED" : charge.collectionStatus;

			await tx.financeCharge.update({
				where: { id: charge.id },
				data: {
					amountPaid: newPaid,
					status: nextStatus,
					collectionStatus: nextCollectionStatus,
				},
			});
		}

		await tx.financePayment.update({
			where: { id: payment.id },
			data: { status: "CANCELLED" },
		});

		// Reverse ledger entries by creating an opposite entry
		const originalLedgers = await tx.financeLedgerEntry.findMany({
			where: { paymentId: payment.id, schoolProfileId },
		});

		for (const ledger of originalLedgers) {
			await tx.financeLedgerEntry.create({
				data: {
					schoolProfileId,
					streamId: ledger.streamId,
					direction: ledger.direction === "CREDIT" ? "DEBIT" : "CREDIT",
					sourceType: "PAYMENT",
					sourceId: payment.id,
					amount: ledger.amount,
					occurredAt: new Date(),
					note: input.note ?? `Reversal of payment ${payment.reference || payment.id}`,
					createdById: ctx.currentUser?.id,
					collectedSessionTermId: ledger.collectedSessionTermId,
					collectedSchoolSessionId: ledger.collectedSchoolSessionId,
					chargeId: ledger.chargeId,
					paymentId: payment.id,
				},
			});
		}

		return { success: true };
	});
}

export async function transferFinanceFunds(
	ctx: TRPCContext,
	input: FinanceTransferInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const amountNumber = toNumber(input.amount);

	if (input.fromStreamId === input.toStreamId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Transfer source and destination streams must be different.",
		});
	}

	if (!input.note?.trim()) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Transfer note or reason is required.",
		});
	}

	if (amountNumber > LARGE_FINANCE_ACTION_THRESHOLD) {
		requireFinanceAdmin(
			ctx,
			"Only an Admin can approve large account transfers.",
		);
	}

	return ctx.db.$transaction(async (tx) => {
		const [fromStream, toStream] = await Promise.all([
			tx.financeStream.findFirst({
				where: { id: input.fromStreamId, schoolProfileId },
			}),
			tx.financeStream.findFirst({
				where: { id: input.toStreamId, schoolProfileId },
			}),
		]);

		if (!fromStream || !toStream) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Both finance streams are required for a transfer.",
			});
		}

		const amount = toMoney(input.amount);
		const collectedSessionTermId = ctx.profile.termId ?? null;
		const collectedSchoolSessionId = ctx.profile.sessionId ?? null;
		await assertTermLedgerWritable(tx as any, {
			schoolProfileId,
			termId: collectedSessionTermId,
		});
		const fromEntries = await tx.financeLedgerEntry.findMany({
			where: {
				schoolProfileId,
				streamId: fromStream.id,
				deletedAt: null,
			},
			select: {
				direction: true,
				amount: true,
			},
		});
		const fromBalance = summarizeLedger(fromEntries).balance;
		if (amountNumber - fromBalance > 0.01 && !isFinanceAdmin(ctx)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Source account does not have enough available balance.",
			});
		}

		const transfer = await tx.financeTransfer.create({
			data: {
				schoolProfileId,
				fromStreamId: fromStream.id,
				toStreamId: toStream.id,
				amount,
				note: input.note,
				sentById: input.sentById ?? ctx.currentUser?.id,
			},
		});

		await tx.financeLedgerEntry.createMany({
			data: [
				{
					schoolProfileId,
					streamId: fromStream.id,
					direction: "DEBIT",
					sourceType: "TRANSFER",
					sourceId: transfer.id,
					amount,
					note: input.note ?? `Transfer to ${toStream.name}`,
					createdById: ctx.currentUser?.id,
					collectedSessionTermId,
					collectedSchoolSessionId,
					transferId: transfer.id,
				},
				{
					schoolProfileId,
					streamId: toStream.id,
					direction: "CREDIT",
					sourceType: "TRANSFER",
					sourceId: transfer.id,
					amount,
					note: input.note ?? `Transfer from ${fromStream.name}`,
					createdById: ctx.currentUser?.id,
					collectedSessionTermId,
					collectedSchoolSessionId,
					transferId: transfer.id,
				},
			],
		});

		return { success: true, transferId: transfer.id };
	});
}

export async function listFinanceTransfers(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const transfers = await ctx.db.financeTransfer.findMany({
		where: { schoolProfileId },
		include: {
			fromStream: { select: { id: true, name: true } },
			toStream: { select: { id: true, name: true } },
		},
		orderBy: [{ createdAt: "desc" }],
		take: 200,
	});

	return transfers.map((transfer) => ({
		id: transfer.id,
		fromStream: transfer.fromStream,
		toStream: transfer.toStream,
		fromWalletName: transfer.fromStream.name,
		toWalletName: transfer.toStream.name,
		amount: toNumber(transfer.amount),
		status: transfer.status.toLowerCase(),
		reference: transfer.id,
		description: transfer.note,
		note: transfer.note,
		sentById: transfer.sentById,
		createdAt: transfer.createdAt,
		transactionDate: transfer.createdAt,
		transactionCount: 2,
		canCancel: transfer.status === "COMPLETED",
	}));
}

export async function listFinancePayments(
	ctx: TRPCContext,
	input?: { payerType?: string | null }
) {
	const schoolProfileId = requireSchoolId(ctx);
	const payments = await ctx.db.financePayment.findMany({
		where: {
			schoolProfileId,
			...(input?.payerType ? { payerType: input.payerType as any } : {}),
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			student: {
				select: { id: true, name: true, surname: true, otherName: true },
			},
			staffProfile: { select: { id: true, name: true, title: true } },
			allocations: {
				include: {
					charge: {
						select: {
							id: true,
							title: true,
							status: true,
							amount: true,
							amountPaid: true,
						},
					},
				},
			},
		},
		orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
		take: 300,
	});

	return payments.map((payment) => ({
		id: payment.id,
		streamId: payment.streamId,
		stream: payment.stream,
		payerType: payment.payerType,
		student: payment.student,
		staffProfile: payment.staffProfile,
		payerName:
			payment.payerType === "STUDENT"
				? [
						payment.student?.surname,
						payment.student?.name,
						payment.student?.otherName,
					]
						.filter(Boolean)
						.join(" ")
				: payment.staffProfile?.name || "School",
		amount: toNumber(payment.amount),
		status: payment.status,
		paymentDate: payment.paymentDate,
		method: payment.method,
		reference: payment.reference,
		note: payment.note,
		allocations: payment.allocations.map((allocation) => ({
			id: allocation.id,
			chargeId: allocation.chargeId,
			amount: toNumber(allocation.amount),
			charge: {
				...allocation.charge,
				amount: toNumber(allocation.charge.amount),
				amountPaid: toNumber(allocation.charge.amountPaid),
			},
		})),
		createdAt: payment.createdAt,
	}));
}

export async function listFinanceLedgerEntries(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const entries = await ctx.db.financeLedgerEntry.findMany({
		where: { schoolProfileId },
		include: {
			charge: {
				select: {
					id: true,
					title: true,
					payerType: true,
					status: true,
					student: {
						select: { id: true, name: true, surname: true, otherName: true },
					},
				},
			},
			payment: {
				select: {
					id: true,
					reference: true,
					method: true,
					status: true,
				},
			},
			transfer: {
				select: {
					id: true,
					note: true,
					status: true,
					fromStreamId: true,
					toStreamId: true,
				},
			},
		},
		orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
		take: 500,
	});

	return entries.map((entry) => ({
		id: entry.id,
		streamId: entry.streamId,
		direction: entry.direction,
		sourceType: entry.sourceType,
		type: entry.direction === "CREDIT" ? "credit" : "debit",
		sourceId: entry.sourceId,
		amount: toNumber(entry.amount),
		occurredAt: entry.occurredAt,
		note: entry.note,
		student: entry.charge?.student ?? null,
		charge: entry.charge,
		payment: entry.payment,
		transfer: entry.transfer,
		createdAt: entry.createdAt,
	}));
}

export async function listFinanceTransactions(ctx: TRPCContext) {
	return listFinanceLedgerEntries(ctx);
}

export async function listFinanceStaff(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);

	return ctx.db.staffProfile.findMany({
		where: { schoolProfileId },
		select: { id: true, name: true, title: true },
		orderBy: { name: "asc" },
	});
}

async function getOrCreateFinancePayee(
	db: any,
	params: {
		schoolProfileId: string;
		payeeId?: string | null;
		name?: string | null;
		type?: string | null;
		phone?: string | null;
		email?: string | null;
		note?: string | null;
		createdById?: string | null;
	},
) {
	if (params.payeeId) {
		const payee = await db.financePayee.findFirst({
			where: {
				id: params.payeeId,
				schoolProfileId: params.schoolProfileId,
				deletedAt: null,
			},
		});

		if (!payee) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance payee was not found.",
			});
		}

		return payee;
	}

	const name = params.name?.trim();
	if (!name) return null;

	const normalizedName = normalizePayeeName(name);
	const existing = await db.financePayee.findFirst({
		where: {
			schoolProfileId: params.schoolProfileId,
			normalizedName,
			deletedAt: null,
		},
	});

	if (existing) return existing;

	return db.financePayee.create({
		data: {
			schoolProfileId: params.schoolProfileId,
			name,
			normalizedName,
			type: (params.type ?? "OTHER") as any,
			phone: params.phone,
			email: params.email,
			note: params.note,
			createdById: params.createdById,
		},
	});
}

export async function listFinancePayees(
	ctx: TRPCContext,
	input?: FinancePayeeQuery,
) {
	requireFinanceReadAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const search = input?.q?.trim();

	const payees = await ctx.db.financePayee.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			...(input?.type ? { type: input.type as any } : {}),
			...(search
				? {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{ phone: { contains: search, mode: "insensitive" } },
							{ email: { contains: search, mode: "insensitive" } },
						],
					}
				: {}),
		},
		select: {
			id: true,
			name: true,
			type: true,
			phone: true,
			email: true,
			note: true,
			_count: {
				select: {
					charges: true,
					payments: true,
					purchases: true,
				},
			},
		},
		orderBy: { name: "asc" },
		take: 50,
	});

	return payees.map((payee) => ({
		...payee,
		usageCount:
			payee._count.charges + payee._count.payments + payee._count.purchases,
	}));
}

export async function upsertFinancePayee(
	ctx: TRPCContext,
	input: FinancePayeeInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const normalizedName = normalizePayeeName(input.name);

	if (input.id) {
		const existing = await ctx.db.financePayee.findFirst({
			where: { id: input.id, schoolProfileId, deletedAt: null },
			select: { id: true },
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Finance payee was not found.",
			});
		}

		const payee = await ctx.db.financePayee.update({
			where: { id: input.id },
			data: {
				name: input.name.trim(),
				normalizedName,
				type: input.type,
				phone: input.phone,
				email: input.email,
				note: input.note,
			},
		});

		return payee;
	}

	return getOrCreateFinancePayee(ctx.db, {
		schoolProfileId,
		name: input.name,
		type: input.type,
		phone: input.phone,
		email: input.email,
		note: input.note,
		createdById: ctx.currentUser?.id,
	});
}

function payrollNetAmount(input: {
	baseAmount: number;
	allowanceAmount?: number;
	deductionAmount?: number;
	advanceAmount?: number;
	bonusAmount?: number;
}) {
	return Math.max(
		0,
		input.baseAmount +
			(input.allowanceAmount ?? 0) +
			(input.bonusAmount ?? 0) -
			(input.deductionAmount ?? 0) -
			(input.advanceAmount ?? 0),
	);
}

export async function upsertFinancePayrollStructure(
	ctx: TRPCContext,
	input: FinancePayrollStructureInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const netAmount = payrollNetAmount({
		baseAmount: input.baseAmount ?? 0,
		allowanceAmount: input.allowanceAmount ?? 0,
		deductionAmount: input.deductionAmount ?? 0,
		advanceAmount: input.advanceAmount ?? 0,
		bonusAmount: input.bonusAmount ?? 0,
	});

	if (input.staffProfileId) {
		const staff = await ctx.db.staffProfile.findFirst({
			where: {
				id: input.staffProfileId,
				schoolProfileId,
				deletedAt: null,
			},
			select: { id: true },
		});

		if (!staff) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Staff profile was not found.",
			});
		}
	}

	const stream = await getOrCreateStream(ctx.db, {
		schoolProfileId,
		streamId: input.streamId,
		streamName: input.streamName ?? "Salary/Wages",
		type: "SALARY",
		accountType: "DEBIT",
	});

	const data = {
		schoolProfileId,
		staffProfileId: input.staffProfileId,
		streamId: stream.id,
		title: input.title.trim(),
		cadence: input.cadence,
		baseAmount: toMoney(input.baseAmount ?? 0),
		allowanceAmount: toMoney(input.allowanceAmount ?? 0),
		deductionAmount: toMoney(input.deductionAmount ?? 0),
		advanceAmount: toMoney(input.advanceAmount ?? 0),
		bonusAmount: toMoney(input.bonusAmount ?? 0),
		netAmount: toMoney(netAmount),
		roleLabel: input.roleLabel,
		isActive: input.isActive ?? true,
		schoolSessionId: input.sessionId ?? ctx.profile.sessionId ?? null,
		sessionTermId: input.termId ?? ctx.profile.termId ?? null,
		notes: input.notes,
		createdById: ctx.currentUser?.id,
	};

	let structure;
	if (input.id) {
		const existing = await ctx.db.financePayrollStructure.findFirst({
			where: { id: input.id, schoolProfileId, deletedAt: null },
			select: { id: true },
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Payroll structure was not found.",
			});
		}
		structure = await ctx.db.financePayrollStructure.update({
			where: { id: input.id },
			data,
		});
	} else {
		structure = await ctx.db.financePayrollStructure.create({ data });
	}

	return {
		...structure,
		baseAmount: toNumber(structure.baseAmount),
		allowanceAmount: toNumber(structure.allowanceAmount),
		deductionAmount: toNumber(structure.deductionAmount),
		advanceAmount: toNumber(structure.advanceAmount),
		bonusAmount: toNumber(structure.bonusAmount),
		netAmount: toNumber(structure.netAmount),
	};
}

export async function createFinancePayrollObligation(
	ctx: TRPCContext,
	input: FinancePayrollObligationInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const structure = await ctx.db.financePayrollStructure.findFirst({
		where: {
			id: input.payrollStructureId,
			schoolProfileId,
			deletedAt: null,
		},
		include: { staffProfile: true, stream: true },
	});

	if (!structure) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Payroll structure was not found.",
		});
	}

	const amount = input.amount ?? toNumber(structure.netAmount);
	return createFinanceCharge(ctx, {
		id: null,
		itemId: null,
		streamId: structure.streamId,
		streamName: null,
		type: "SALARY",
		payerType: "STAFF",
		studentId: null,
		studentTermFormId: null,
		staffProfileId: structure.staffProfileId,
		staffTermProfileId: null,
		payeeId: null,
		payrollStructureId: structure.id,
		classroomDepartmentId: null,
		sessionId: input.sessionId ?? structure.schoolSessionId,
		termId: input.termId ?? structure.sessionTermId,
		title: input.title ?? structure.title,
		description: input.description ?? structure.notes,
		amount,
		collectionStatus: "NOT_REQUIRED",
		dueDate: input.dueDate,
	});
}

export async function recordFinancePurchase(
	ctx: TRPCContext,
	input: FinancePurchaseInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);
	const quantity = input.quantity ?? 1;
	const totalCost = input.totalCost ?? quantity * (input.unitCost ?? 0);
	const amountPaid = input.amountPaid ?? 0;

	if (amountPaid > totalCost) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Paid amount cannot exceed purchase cost.",
		});
	}

	await assertTermLedgerWritable(ctx.db as any, {
		schoolProfileId,
		termId,
	});

	const created = await ctx.db.$transaction(async (tx) => {
		const stream = await getOrCreateStream(tx, {
			schoolProfileId,
			streamId: input.streamId,
			streamName: input.streamName ?? "Purchases",
			type: input.kind === "LABOR" || input.kind === "SERVICE" ? "SERVICE" : "OTHER",
			accountType: "DEBIT",
		});
		const payee = await getOrCreateFinancePayee(tx, {
			schoolProfileId,
			payeeId: input.payeeId,
			name: input.payeeName,
			type: input.payeeType ?? (input.kind === "LABOR" ? "CASUAL_WORKER" : "VENDOR"),
			createdById: ctx.currentUser?.id,
		});
		const charge = await tx.financeCharge.create({
			data: {
				schoolProfileId,
				streamId: stream.id,
				payerType: "SCHOOL",
				payeeId: payee?.id,
				schoolSessionId: sessionId,
				sessionTermId: termId,
				title: input.title,
				description: input.description,
				amount: toMoney(totalCost),
				amountPaid: toMoney(0),
				status: amountPaid > 0 ? "PARTIALLY_PAID" : "PENDING",
				collectionStatus: "NOT_REQUIRED",
				createdById: ctx.currentUser?.id,
			},
		});
		const status =
			amountPaid <= 0
				? "UNPAID"
				: amountPaid >= totalCost
					? "PAID"
					: "PARTIALLY_PAID";
		const purchase = await tx.financePurchase.create({
			data: {
				schoolProfileId,
				streamId: stream.id,
				payeeId: payee?.id,
				chargeId: charge.id,
				kind: input.kind,
				status,
				title: input.title,
				description: input.description,
				quantity: toMoney(quantity),
				unitCost: toMoney(input.unitCost ?? 0),
				totalCost: toMoney(totalCost),
				amountPaid: toMoney(0),
				receiptNumber: input.receiptNumber,
				reference: input.reference,
				note: input.note,
				schoolSessionId: sessionId,
				sessionTermId: termId,
				occurredAt: input.paymentDate ?? new Date(),
				createdById: ctx.currentUser?.id,
			},
		});

		return { purchase, charge, stream, payee };
	});

	let paymentResult: Awaited<ReturnType<typeof recordFinancePayment>> | null =
		null;
	if (amountPaid > 0) {
		paymentResult = await recordFinancePayment(ctx, {
			chargeId: created.charge.id,
			amount: amountPaid,
			paymentDate: input.paymentDate,
			method: input.method,
			reference: input.reference,
			note: input.note ?? input.description,
			receivedById: ctx.currentUser?.id,
			collectedTermId: termId,
			collectedSessionId: sessionId,
		});

		await ctx.db.financePurchase.update({
			where: { id: created.purchase.id },
			data: {
				paymentId: paymentResult.paymentId,
				amountPaid: toMoney(amountPaid),
				status: amountPaid >= totalCost ? "PAID" : "PARTIALLY_PAID",
			},
		});
	}

	return {
		success: true,
		purchaseId: created.purchase.id,
		chargeId: created.charge.id,
		paymentId: paymentResult?.paymentId ?? null,
		streamId: created.stream.id,
		payeeId: created.payee?.id ?? null,
		status:
			amountPaid <= 0
				? "UNPAID"
				: amountPaid >= totalCost
					? "PAID"
					: "PARTIALLY_PAID",
		totalCost,
		amountPaid,
	};
}

export async function cancelFinancePurchase(
	ctx: TRPCContext,
	input: FinancePurchaseCancellationInput,
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const purchase = await ctx.db.financePurchase.findFirst({
		where: {
			id: input.purchaseId,
			schoolProfileId,
			deletedAt: null,
		},
		select: {
			id: true,
			chargeId: true,
			paymentId: true,
			status: true,
		},
	});

	if (!purchase) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Purchase record was not found.",
		});
	}

	if (purchase.status === "CANCELLED" || purchase.status === "REFUNDED") {
		return { success: true, purchaseId: purchase.id, status: purchase.status };
	}

	if (purchase.paymentId) {
		await reverseFinancePayment(ctx, {
			paymentId: purchase.paymentId,
			note: input.reason,
		});
	}

	const nextStatus = purchase.paymentId ? "REFUNDED" : "CANCELLED";
	await ctx.db.$transaction(async (tx) => {
		await tx.financePurchase.update({
			where: { id: purchase.id },
			data: {
				status: nextStatus,
				cancelledAt: new Date(),
				cancelledById: ctx.currentUser?.id,
				cancellationReason: input.reason,
			},
		});

		if (purchase.chargeId) {
			await tx.financeCharge.update({
				where: { id: purchase.chargeId },
				data: {
					status: "CANCELLED",
					cancelledAt: new Date(),
					cancelledById: ctx.currentUser?.id,
					cancellationReason: input.reason,
				},
			});
		}
	});

	return {
		success: true,
		purchaseId: purchase.id,
		status: nextStatus,
		reversedPaymentId: purchase.paymentId,
	};
}

export async function searchFinanceStudents(
	ctx: TRPCContext,
	input?: { q?: string | null; query?: string | null },
) {
	const schoolProfileId = requireSchoolId(ctx);
	const search = input?.q ?? input?.query ?? "";
	const students = await ctx.db.students.findMany({
		where: {
			schoolProfileId,
			...(search
				? {
						OR: [
							{ name: { contains: search, mode: "insensitive" } },
							{ surname: { contains: search, mode: "insensitive" } },
							{ otherName: { contains: search, mode: "insensitive" } },
						],
					}
				: {}),
		},
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				take: 1,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: { select: { title: true } },
				},
			},
		},
		orderBy: [{ surname: "asc" }, { name: "asc" }],
		take: 25,
	});

	return students.map((student) => {
		const term = student.termForms[0];

		return {
			id: student.id,
			name: student.name,
			surname: student.surname,
			otherName: student.otherName,
			classroomId: term?.classroomDepartment?.id ?? null,
			classroom: term?.classroomDepartment
				? [
						term.classroomDepartment.classRoom?.name,
						term.classroomDepartment.departmentName,
					]
						.filter(Boolean)
						.join(" ")
				: null,
			currentTermLabel: term?.sessionTerm?.title ?? null,
			hasCurrentTermSheet: Boolean(term),
		};
	});
}

export async function getStudentFinanceStatement(
	ctx: TRPCContext,
	input: {
		studentId: string;
		termId?: string | null;
		sessionId?: string | null;
	},
) {
	const schoolProfileId = requireSchoolId(ctx);
	await reconcileStudentTermCharges(ctx, input);

	const student = await ctx.db.students.findFirst({
		where: { id: input.studentId, schoolProfileId },
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					deletedAt: null,
					...(input.termId ? { sessionTermId: input.termId } : {}),
					...(input.sessionId ? { schoolSessionId: input.sessionId } : {}),
				},
				take: 1,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { id: true, title: true } },
						},
					},
				},
			},
		},
	});
	const charges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId,
			studentId: input.studentId,
			deletedAt: null,
			status: { not: "CANCELLED" },
			...(input.termId ? { sessionTermId: input.termId } : {}),
			...(input.sessionId ? { schoolSessionId: input.sessionId } : {}),
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			studentTermForm: {
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { id: true, title: true } },
						},
					},
				},
			},
			allocations: {
				include: {
					payment: true,
				},
			},
		},
		orderBy: [{ createdAt: "desc" }],
	});

	const normalizedCharges = charges.map((charge) => {
		const amount = toNumber(charge.amount);
		const paidAmount = toNumber(charge.amountPaid);
		const pendingAmount = amount - paidAmount;
		const termForm = charge.studentTermForm ?? student?.termForms[0] ?? null;
		const key = charge.id;

		return {
			key,
			id: charge.id,
			source: "billable" as const,
			studentTermFormId: termForm?.id ?? charge.studentTermFormId ?? "",
			studentFeeId: null,
			billableHistoryId: charge.id,
			feeHistoryId: null,
			title: charge.title,
			description: charge.description,
			amount,
			paidAmount,
			amountPaid: paidAmount,
			pendingAmount,
			outstanding: pendingAmount,
			status:
				charge.status === "PAID"
					? "PAID"
					: charge.status === "PARTIALLY_PAID"
						? "PARTIAL"
						: "PENDING",
			chargeStatus: charge.status,
			collectionStatus: charge.collectionStatus,
			stream: charge.stream,
			streamId: charge.streamId,
			streamName: charge.stream.name,
			classroomNames: [
				[
					termForm?.classroomDepartment?.classRoom?.name,
					termForm?.classroomDepartment?.departmentName,
				]
					.filter(Boolean)
					.join(" "),
			].filter(Boolean),
			payments: charge.allocations.map((allocation) => ({
				id: allocation.payment.id,
				amount: toNumber(allocation.amount),
				status:
					allocation.payment.status === "PAID"
						? "success"
						: allocation.payment.status.toLowerCase(),
				type: "FEE" as const,
				paymentType: allocation.payment.method,
				description: allocation.payment.note,
				createdAt: allocation.payment.paymentDate,
				studentFee: { feeTitle: charge.title },
				walletTransaction: {
					id: allocation.payment.id,
					summary: allocation.payment.method,
					transactionDate: allocation.payment.paymentDate,
					status:
						allocation.payment.status === "PAID"
							? "success"
							: allocation.payment.status.toLowerCase(),
				},
				paymentDate: allocation.payment.paymentDate,
				method: allocation.payment.method,
				reference: allocation.payment.reference,
			})),
		};
	});

	const termGroups = new Map<string, typeof normalizedCharges>();
	for (const row of normalizedCharges) {
		const key = row.studentTermFormId || "current";
		termGroups.set(key, [...(termGroups.get(key) ?? []), row]);
	}

	const currentTermForm = student?.termForms[0] ?? null;
	const terms = Array.from(termGroups.entries()).map(([id, rows]) => {
		const first = rows[0];
		const totalDue = rows.reduce((sum, row) => sum + row.amount, 0);
		const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
		const totalPending = rows.reduce((sum, row) => sum + row.pendingAmount, 0);

		return {
			id,
			sessionTermId: currentTermForm?.sessionTermId ?? input.termId ?? id,
			schoolSessionId:
				currentTermForm?.schoolSessionId ?? input.sessionId ?? "",
			title: currentTermForm?.sessionTerm?.title ?? "Current term",
			sessionTitle: currentTermForm?.sessionTerm?.session?.title ?? null,
			label: currentTermForm?.sessionTerm?.title ?? "Current term",
			classroomName: first?.classroomNames?.[0] ?? null,
			isCurrent: id === currentTermForm?.id,
			rows,
			totals: {
				totalDue,
				totalPaid,
				totalPending,
			},
		};
	});

	return {
		student: student
			? {
					id: student.id,
					name: studentDisplayName(student),
					currentClassroom: [
						currentTermForm?.classroomDepartment?.classRoom?.name,
						currentTermForm?.classroomDepartment?.departmentName,
					]
						.filter(Boolean)
						.join(" "),
					currentTerm: currentTermForm?.sessionTerm?.title ?? null,
				}
			: null,
		currentTermForm,
		terms,
		charges: normalizedCharges,
		feeItems: normalizedCharges,
		manualFeeHistories: [],
		otherCharges: [],
		alert: null,
		summary: {
			totalCharged: normalizedCharges.reduce((sum, row) => sum + row.amount, 0),
			totalPaid: normalizedCharges.reduce(
				(sum, row) => sum + row.amountPaid,
				0,
			),
			totalOutstanding: normalizedCharges.reduce(
				(sum, row) => sum + row.outstanding,
				0,
			),
			totalDue: normalizedCharges.reduce((sum, row) => sum + row.amount, 0),
			totalPending: normalizedCharges.reduce(
				(sum, row) => sum + row.outstanding,
				0,
			),
		},
	};
}

export async function getReceivePaymentOptions(
	ctx: TRPCContext,
	input: FinanceReceivePaymentOptionsInput,
) {
	requireFinanceReadAccess(ctx);

	const schoolProfileId = requireSchoolId(ctx);
	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);

	await reconcileStudentTermCharges(ctx, {
		studentId: input.studentId,
		termId,
		sessionId,
	});

	const student = await ctx.db.students.findFirst({
		where: { id: input.studentId, schoolProfileId },
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					deletedAt: null,
					...(termId ? { sessionTermId: termId } : {}),
					...(sessionId ? { schoolSessionId: sessionId } : {}),
				},
				take: 1,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					classroomDepartmentId: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { id: true, name: true } },
						},
					},
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { id: true, title: true } },
						},
					},
				},
			},
		},
	});

	if (!student) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Student was not found.",
		});
	}

	const termForm = student.termForms[0] ?? null;
	const effectiveTermId = termId ?? termForm?.sessionTermId ?? null;
	const effectiveSessionId = sessionId ?? termForm?.schoolSessionId ?? null;
	const classroomDepartmentId = termForm?.classroomDepartmentId ?? null;

	const classApplicability: Prisma.FinanceItemWhereInput[] = [
		{
			applicableClasses: {
				none: {
					deletedAt: null,
				},
			},
		},
	];

	if (classroomDepartmentId) {
		classApplicability.push({
			applicableClasses: {
				some: {
					deletedAt: null,
					classRoomDepartmentId: classroomDepartmentId,
				},
			},
		});
	}

	const configuredItems = await ctx.db.financeItem.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			isActive: true,
			collectable: true,
			...(effectiveTermId
				? { OR: [{ sessionTermId: effectiveTermId }, { sessionTermId: null }] }
				: {}),
			AND: [
				...(effectiveSessionId
					? [
							{
								OR: [
									{ schoolSessionId: effectiveSessionId },
									{ schoolSessionId: null },
								],
							},
						]
					: []),
				{ OR: classApplicability },
			],
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			applicableClasses: {
				where: { deletedAt: null },
				include: {
					classRoomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { id: true, name: true } },
						},
					},
				},
			},
		},
		orderBy: [{ type: "asc" }, { name: "asc" }],
	});

	const outstandingCharges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId,
			studentId: input.studentId,
			deletedAt: null,
			status: { in: ["PENDING", "PARTIALLY_PAID"] },
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
			item: { select: { id: true, type: true, name: true, isActive: true } },
			studentTermForm: {
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { id: true, title: true } },
						},
					},
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { id: true, name: true } },
						},
					},
				},
			},
		},
		orderBy: [{ createdAt: "desc" }],
	});

	type DescriptionOption = {
		id: string;
		source: "configuredItem" | "outstandingCharge";
		title: string;
		description: string | null;
		itemId: string | null;
		chargeId: string | null;
		streamId: string;
		itemType: string | null;
		amount: number;
		amountPaid: number;
		amountDue: number;
		defaultAmount: number;
		sessionTermId: string | null;
		schoolSessionId: string | null;
		termLabel: string | null;
		classroomNames: string[];
		isActive: boolean;
		collectable: boolean;
	};

	type PaymentTypeOption = {
		id: string;
		title: string;
		normalizedTitle: string;
		streamId: string;
		streamName: string;
		accountType: "CREDIT" | "DEBIT";
		source: "configured" | "outstanding" | "mixed";
		itemTypes: string[];
		hasOutstanding: boolean;
		hasConfiguredItems: boolean;
		defaultAmount: number;
		descriptions: DescriptionOption[];
	};

	const paymentTypes = new Map<string, PaymentTypeOption>();

	function upsertPaymentType(params: {
		stream: { id: string; name: string; accountType: "CREDIT" | "DEBIT" };
		source: "configured" | "outstanding";
		itemType?: string | null;
		description: DescriptionOption;
	}) {
		const existing = paymentTypes.get(params.stream.id);
		const nextSource: PaymentTypeOption["source"] =
			existing && existing.source !== params.source ? "mixed" : params.source;
		const descriptions = existing?.descriptions ?? [];
		const hasDescription = descriptions.some(
			(description) => description.id === params.description.id,
		);
		const itemTypes = new Set(existing?.itemTypes ?? []);

		if (params.itemType) itemTypes.add(params.itemType);

		paymentTypes.set(params.stream.id, {
			id: `stream:${params.stream.id}`,
			title: params.stream.name,
			normalizedTitle: normalizeOptionTitle(params.stream.name),
			streamId: params.stream.id,
			streamName: params.stream.name,
			accountType: params.stream.accountType,
			source: nextSource,
			itemTypes: [...itemTypes],
			hasOutstanding:
				(existing?.hasOutstanding ?? false) ||
				params.source === "outstanding",
			hasConfiguredItems:
				(existing?.hasConfiguredItems ?? false) ||
				params.source === "configured",
			defaultAmount:
				existing?.defaultAmount && existing.defaultAmount > 0
					? existing.defaultAmount
					: params.description.defaultAmount,
			descriptions: hasDescription
				? descriptions
				: [...descriptions, params.description],
		});
	}

	for (const item of configuredItems) {
		upsertPaymentType({
			stream: item.stream,
			source: "configured",
			itemType: item.type,
			description: {
				id: `item:${item.id}`,
				source: "configuredItem",
				title: item.name,
				description: item.description,
				itemId: item.id,
				chargeId: null,
				streamId: item.streamId,
				itemType: item.type,
				amount: toNumber(item.amount),
				amountPaid: 0,
				amountDue: toNumber(item.amount),
				defaultAmount: toNumber(item.amount),
				sessionTermId: item.sessionTermId,
				schoolSessionId: item.schoolSessionId,
				termLabel: null,
				classroomNames: item.applicableClasses.map((row) =>
					[
						row.classRoomDepartment.classRoom?.name,
						row.classRoomDepartment.departmentName,
					]
						.filter(Boolean)
						.join(" "),
				),
				isActive: item.isActive,
				collectable: item.collectable,
			},
		});
	}

	for (const charge of outstandingCharges) {
		const amount = toNumber(charge.amount);
		const amountPaid = toNumber(charge.amountPaid);
		const amountDue = Math.max(amount - amountPaid, 0);
		if (amountDue <= 0) continue;

		upsertPaymentType({
			stream: charge.stream,
			source: "outstanding",
			itemType: charge.item?.type ?? null,
			description: {
				id: `charge:${charge.id}`,
				source: "outstandingCharge",
				title: charge.title,
				description: charge.description,
				itemId: charge.itemId,
				chargeId: charge.id,
				streamId: charge.streamId,
				itemType: charge.item?.type ?? null,
				amount,
				amountPaid,
				amountDue,
				defaultAmount: amountDue,
				sessionTermId:
					charge.sessionTermId ?? charge.studentTermForm?.sessionTermId ?? null,
				schoolSessionId:
					charge.schoolSessionId ?? charge.studentTermForm?.schoolSessionId ?? null,
				termLabel: charge.studentTermForm?.sessionTerm?.title ?? null,
				classroomNames: [
					[
						charge.studentTermForm?.classroomDepartment?.classRoom?.name,
						charge.studentTermForm?.classroomDepartment?.departmentName,
					]
						.filter(Boolean)
						.join(" "),
				].filter(Boolean),
				isActive: charge.item?.isActive ?? true,
				collectable: true,
			},
		});
	}

	const sortedPaymentTypes = [...paymentTypes.values()].sort((a, b) => {
		if (a.hasOutstanding !== b.hasOutstanding) {
			return a.hasOutstanding ? -1 : 1;
		}

		if (a.hasConfiguredItems !== b.hasConfiguredItems) {
			return a.hasConfiguredItems ? -1 : 1;
		}

		return a.title.localeCompare(b.title);
	});

	return {
		student: {
			id: student.id,
			name: studentDisplayName(student),
			currentClassroom: [
				termForm?.classroomDepartment?.classRoom?.name,
				termForm?.classroomDepartment?.departmentName,
			]
				.filter(Boolean)
				.join(" "),
			currentTerm: termForm?.sessionTerm?.title ?? null,
			currentTermFormId: termForm?.id ?? null,
			classroomDepartmentId,
			sessionTermId: effectiveTermId,
			schoolSessionId: effectiveSessionId,
		},
		context: {
			termId: effectiveTermId,
			sessionId: effectiveSessionId,
			termTitle: termForm?.sessionTerm?.title ?? null,
			sessionTitle: termForm?.sessionTerm?.session?.title ?? null,
		},
		paymentTypes: sortedPaymentTypes,
		summary: {
			paymentTypeCount: sortedPaymentTypes.length,
			descriptionCount: sortedPaymentTypes.reduce(
				(sum, paymentType) => sum + paymentType.descriptions.length,
				0,
			),
			outstandingCount: outstandingCharges.length,
			totalOutstanding: outstandingCharges.reduce(
				(sum, charge) =>
					sum +
					Math.max(toNumber(charge.amount) - toNumber(charge.amountPaid), 0),
				0,
			),
		},
		permissions: financePermissionFlags(ctx),
	};
}

export async function receiveStudentPaymentSimple(
	ctx: TRPCContext,
	input: FinanceSimpleStudentPaymentInput,
) {
	requireFinanceWriteAccess(ctx);

	const schoolProfileId = requireSchoolId(ctx);
	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);
	const amountPaid = toNumber(input.amountPaid);
	const amountDue = input.amountDue == null ? null : toNumber(input.amountDue);

	if (amountPaid <= 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Payment amount must be greater than zero.",
		});
	}

	if (amountDue != null && amountPaid - amountDue > 0.01) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Payment amount cannot exceed the amount due.",
		});
	}

	const student = await ctx.db.students.findFirst({
		where: { id: input.studentId, schoolProfileId },
		select: { id: true },
	});

	if (!student) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Student was not found.",
		});
	}

	const termForm = input.studentTermFormId
		? await ctx.db.studentTermForm.findFirst({
				where: {
					id: input.studentTermFormId,
					studentId: input.studentId,
					schoolProfileId,
					deletedAt: null,
				},
				select: {
					id: true,
					studentId: true,
					sessionTermId: true,
					schoolSessionId: true,
					classroomDepartmentId: true,
				},
			})
		: await findStudentTermFormForFinance(ctx.db, {
				schoolProfileId,
				studentId: input.studentId,
				termId,
				sessionId,
			});

	if (!termForm) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Student term sheet is required for receiving payment.",
		});
	}

	let chargeId = input.chargeId ?? null;

	if (chargeId) {
		const charge = await ctx.db.financeCharge.findFirst({
			where: {
				id: chargeId,
				schoolProfileId,
				studentId: input.studentId,
				deletedAt: null,
				status: { notIn: ["CANCELLED", "WAIVED"] },
			},
			select: {
				id: true,
				amount: true,
				amountPaid: true,
			},
		});

		if (!charge) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Outstanding charge was not found for this student.",
			});
		}

		const outstanding = toNumber(charge.amount) - toNumber(charge.amountPaid);
		if (amountPaid - outstanding > 0.01) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Payment amount cannot exceed the outstanding charge amount.",
			});
		}
	} else if (input.itemId) {
		const item = await ctx.db.financeItem.findFirst({
			where: {
				id: input.itemId,
				schoolProfileId,
				deletedAt: null,
				isActive: true,
				collectable: true,
				OR: [
					{ sessionTermId: termForm.sessionTermId },
					{ sessionTermId: null },
				],
				AND: [
					{
						OR: [
							{ schoolSessionId: termForm.schoolSessionId },
							{ schoolSessionId: null },
						],
					},
					{
						OR: [
							{ applicableClasses: { none: { deletedAt: null } } },
							...(termForm.classroomDepartmentId
								? [
										{
											applicableClasses: {
												some: {
													deletedAt: null,
													classRoomDepartmentId:
														termForm.classroomDepartmentId,
												},
											},
										},
									]
								: []),
						],
					},
				],
			},
			select: {
				id: true,
				type: true,
				name: true,
				description: true,
				amount: true,
				streamId: true,
			},
		});

		if (!item) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Payment item was not found or does not apply to this student.",
			});
		}

		const charge = await createFinanceCharge(ctx, {
			id: null,
			itemId: item.id,
			streamId: item.streamId,
			type: item.type,
			payerType: "STUDENT",
			studentId: input.studentId,
			studentTermFormId: termForm.id,
			staffProfileId: null,
			staffTermProfileId: null,
			classroomDepartmentId: termForm.classroomDepartmentId,
			sessionId: termForm.schoolSessionId,
			termId: termForm.sessionTermId,
			title: item.name,
			description: input.description ?? item.description,
			amount: amountDue ?? toNumber(item.amount),
			collectionStatus: "NOT_COLLECTED",
			dueDate: null,
		});
		chargeId = charge.id;
	} else {
		const title =
			input.descriptionTitle?.trim() ||
			input.paymentTypeTitle?.trim() ||
			input.streamName?.trim();

		if (!title) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Payment description is required.",
			});
		}

		const charge = await createFinanceCharge(ctx, {
			id: null,
			itemId: null,
			streamId: input.streamId,
			streamName: input.streamName,
			type: "OTHER",
			payerType: "STUDENT",
			studentId: input.studentId,
			studentTermFormId: termForm.id,
			staffProfileId: null,
			staffTermProfileId: null,
			classroomDepartmentId: termForm.classroomDepartmentId,
			sessionId: termForm.schoolSessionId,
			termId: termForm.sessionTermId,
			title,
			description: input.description,
			amount: amountDue ?? amountPaid,
			collectionStatus: "NOT_REQUIRED",
			dueDate: null,
		});
		chargeId = charge.id;
	}

	return recordFinancePayment(ctx, {
		chargeId,
		amount: amountPaid,
		paymentDate: input.paymentDate,
		method: input.method,
		reference: input.reference,
		note: input.note ?? input.description,
		receivedById: ctx.currentUser?.id,
		collectedTermId: termId,
		collectedSessionId: sessionId,
	});
}

export async function getFinanceTermLedger(
	ctx: TRPCContext,
	input?: FinanceTermLedgerQuery,
) {
	requireFinanceReadAccess(ctx);

	const schoolProfileId = requireSchoolId(ctx);
	const termId = input?.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input?.sessionId ?? (termId ? null : ctx.profile.sessionId ?? null);

	if (!termId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Term context is required for the term ledger.",
		});
	}

	const term = await ctx.db.sessionTerm.findFirst({
		where: {
			id: termId,
			schoolId: schoolProfileId,
			deletedAt: null,
			...(sessionId ? { sessionId } : {}),
		},
		select: {
			id: true,
			title: true,
			startDate: true,
			endDate: true,
			createdAt: true,
			sessionId: true,
			session: { select: { id: true, title: true } },
		},
	});

	if (!term) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Term ledger was not found.",
		});
	}
	const closeRecord = await (ctx.db as any).financeTermLedgerClose?.findFirst?.({
		where: {
			schoolProfileId,
			sessionTermId: term.id,
			deletedAt: null,
		},
		orderBy: [{ createdAt: "desc" }],
	});

	const streamAccounts = await listFinanceStreams(ctx, {
		termId: term.id,
		sessionId: term.sessionId,
	});
	const payableCharges = await ctx.db.financeCharge.findMany({
		where: {
			schoolProfileId,
			deletedAt: null,
			payerType: { in: ["STAFF", "SCHOOL"] },
			status: { in: ["PENDING", "PARTIALLY_PAID"] },
			sessionTermId: term.id,
			schoolSessionId: term.sessionId,
		},
		select: {
			id: true,
			streamId: true,
			amount: true,
			amountPaid: true,
		},
	});
	const payableSummaryByStream = new Map<
		string,
		{ count: number; outstanding: number }
	>();

	for (const charge of payableCharges) {
		const outstanding = Math.max(
			toNumber(charge.amount) - toNumber(charge.amountPaid),
			0,
		);
		if (outstanding <= 0) continue;
		const current = payableSummaryByStream.get(charge.streamId) ?? {
			count: 0,
			outstanding: 0,
		};
		current.count += 1;
		current.outstanding += outstanding;
		payableSummaryByStream.set(charge.streamId, current);
	}

	const accounts = streamAccounts.map((account) => {
		const payableSummary = payableSummaryByStream.get(account.id) ?? {
			count: 0,
			outstanding: 0,
		};
		const needsFunding =
			account.projectedBalance < 0 ||
			payableSummary.outstanding > Math.max(account.balance, 0);

		return {
			...account,
			outstandingPayables: payableSummary.outstanding,
			outstandingPayablesCount: payableSummary.count,
			needsFunding,
			statusLabel: needsFunding ? "Needs Funding" : "Available",
		};
	});
	const moneyIn = accounts.reduce((sum, account) => sum + account.totalIn, 0);
	const moneyOut = accounts.reduce((sum, account) => sum + account.totalOut, 0);
	const availableBalance = accounts.reduce(
		(sum, account) => sum + account.balance,
		0,
	);
	const deficitAccounts = accounts.filter(
		(account) => account.projectedBalance < 0,
	);
	const outstandingPayables = accounts.reduce(
		(sum, account) => sum + account.outstandingPayables,
		0,
	);
	const outstandingPayablesCount = accounts.reduce(
		(sum, account) => sum + account.outstandingPayablesCount,
		0,
	);
	const needsFundingAccounts = accounts.filter((account) => account.needsFunding);

	return {
		id: `term-ledger:${term.id}`,
		termId: term.id,
		sessionId: term.sessionId,
		title: `${term.session?.title ? `${term.session.title} · ` : ""}${term.title}`,
		termTitle: term.title,
		sessionTitle: term.session?.title ?? null,
		status: (closeRecord?.status ?? "OPEN") as
			| "OPEN"
			| "CLOSING"
			| "CLOSED"
			| "REOPENED",
		statusLabel:
			closeRecord?.status === "CLOSED"
				? "Closed"
				: closeRecord?.status === "REOPENED"
					? "Reopened"
					: closeRecord?.status === "CLOSING"
						? "Closing"
						: "Open",
		isCurrent: term.id === ctx.profile.termId,
		startDate: term.startDate,
		endDate: term.endDate,
		createdAt: term.createdAt,
		accounts,
		summary: {
			moneyIn,
			moneyOut,
			availableBalance,
			accountCount: accounts.length,
			deficitAccountCount: deficitAccounts.length,
			deficitAmount: deficitAccounts.reduce(
				(sum, account) => sum + Math.abs(account.projectedBalance),
				0,
			),
			outstandingPayables,
			outstandingPayablesCount,
			needsFundingAccountCount: needsFundingAccounts.length,
		},
		lifecycle: {
			current: (closeRecord?.status ?? "OPEN") as
				| "OPEN"
				| "CLOSING"
				| "CLOSED"
				| "REOPENED",
			availableStatuses: ["DRAFT", "OPEN", "CLOSING", "CLOSED", "REOPENED"],
			canClose: financePermissionFlags(ctx).canCreateSchoolFee,
			canReopen: financePermissionFlags(ctx).canCreateSchoolFee,
			isReadOnly: closeRecord?.status === "CLOSED",
		},
		permissions: {
			canView: true,
			canClose: financePermissionFlags(ctx).canCreateSchoolFee,
			canReopen: financePermissionFlags(ctx).canCreateSchoolFee,
		},
	};
}

async function findCarryForwardNextTerm(
	ctx: TRPCContext,
	params: {
		schoolProfileId: string;
		currentTerm: {
			id: string;
			sessionId: string | null;
			startDate?: Date | string | null;
			createdAt?: Date | string | null;
		};
		nextTermId?: string | null;
	},
) {
	return ctx.db.sessionTerm.findFirst({
		where: {
			schoolId: params.schoolProfileId,
			deletedAt: null,
			...(params.nextTermId
				? { id: params.nextTermId }
				: {
						id: { not: params.currentTerm.id },
						...(params.currentTerm.sessionId
							? { sessionId: params.currentTerm.sessionId }
							: {}),
						...(params.currentTerm.startDate
							? { startDate: { gt: params.currentTerm.startDate } }
							: params.currentTerm.createdAt
								? { createdAt: { gt: params.currentTerm.createdAt } }
								: {}),
					}),
		},
		select: { id: true, sessionId: true, title: true },
		orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
	});
}

export async function previewFinanceTermClose(
	ctx: TRPCContext,
	input?: FinanceTermCloseInput,
) {
	requireFinanceReadAccess(ctx);

	const schoolProfileId = requireSchoolId(ctx);
	const ledger = await getFinanceTermLedger(ctx, input);
	const existingClose = await (ctx.db as any).financeTermLedgerClose?.findFirst?.({
		where: {
			schoolProfileId,
			sessionTermId: ledger.termId,
			status: "CLOSED",
			deletedAt: null,
		},
		select: { id: true, closedAt: true },
	});
	const nextTerm = await findCarryForwardNextTerm(ctx, {
		schoolProfileId,
		currentTerm: {
			id: ledger.termId,
			sessionId: ledger.sessionId,
			startDate: ledger.startDate,
			createdAt: ledger.createdAt,
		},
		nextTermId: input?.nextTermId,
	});
	const [
		missingLedgerTerms,
		unresolvedTransfers,
		cancelledLedgerEffects,
		unmatchedCarryForwards,
	] = await Promise.all([
		ctx.db.financeLedgerEntry.findMany({
			where: {
				schoolProfileId,
				deletedAt: null,
				collectedSessionTermId: null,
				charge: { sessionTermId: null },
			},
			select: { id: true },
			take: 1,
		}),
		ctx.db.financeTransfer.findMany({
			where: {
				schoolProfileId,
				deletedAt: null,
				status: { not: "COMPLETED" },
			},
			select: { id: true },
			take: 1,
		}),
		ctx.db.financeLedgerEntry.findMany({
			where: {
				schoolProfileId,
				deletedAt: null,
				OR: [
					{ charge: { status: "CANCELLED" } },
					{ payment: { status: { in: ["CANCELLED", "REFUNDED"] } } },
				],
			},
			select: { id: true },
			take: 1,
		}),
		(ctx.db as any).financeTermCarryForward?.findMany
			? (ctx.db as any).financeTermCarryForward.findMany({
					where: {
						schoolProfileId,
						deletedAt: null,
						ledgerEntryId: null,
					},
					select: { id: true },
					take: 1,
				})
			: [],
	]);
	const carryForwards = ledger.accounts
		.map((account) => {
			const balance = Number(account.balance || 0);
			return {
				streamId: account.id,
				accountName: account.name,
				amount: Math.abs(balance),
				direction: balance < 0 ? ("DEBIT" as const) : ("CREDIT" as const),
				nextSessionTermId: nextTerm?.id ?? null,
				nextSchoolSessionId: nextTerm?.sessionId ?? null,
			};
		})
		.filter((row) => row.amount > 0);
	const warnings = [
		...(ledger.summary.deficitAccountCount > 0
			? [
					{
						key: "negative-accounts",
						label: "Negative Accounts",
						message: `${ledger.summary.deficitAccountCount} account(s) need funding before close.`,
					},
				]
			: []),
		...(ledger.summary.outstandingPayables > 0
			? [
					{
						key: "outstanding-payables",
						label: "Outstanding Payables",
						message: `${ledger.summary.outstandingPayablesCount} payable(s) remain outstanding.`,
					},
				]
			: []),
		...(missingLedgerTerms.length
			? [
					{
						key: "missing-ledger-terms",
						label: "Missing Ledger Terms",
						message:
							"Some ledger entries need collected-in or paid-for term attribution review.",
					},
				]
			: []),
		...(unresolvedTransfers.length
			? [
					{
						key: "unresolved-transfers",
						label: "Unresolved Transfers",
						message: "Some account transfers are not completed.",
					},
				]
			: []),
		...(cancelledLedgerEffects.length
			? [
					{
						key: "cancelled-ledger-effects",
						label: "Cancelled Ledger Effects",
						message:
							"Some cancelled or refunded finance records still have ledger effects to review.",
					},
				]
			: []),
		...(unmatchedCarryForwards.length
			? [
					{
						key: "unmatched-carry-forward",
						label: "Unmatched Carry Forward",
						message:
							"Some carry-forward rows are not linked to opening ledger entries.",
					},
				]
			: []),
		...(nextTerm
			? []
			: [
					{
						key: "missing-next-term",
						label: "No Next Term",
						message:
							"Carry-forward rows can be created, but opening ledger entries need a next term.",
					},
				]),
	];

	return {
		ledger,
		nextTerm,
		canClose: financePermissionFlags(ctx).canCreateSchoolFee && !existingClose,
		blockers: existingClose
			? [
					{
						key: "already-closed",
						label: "Already Closed",
						message: "This term ledger has already been closed.",
					},
				]
			: [],
		warnings,
		carryForwards,
	};
}

export async function closeFinanceTermLedger(
	ctx: TRPCContext,
	input?: FinanceTermCloseInput,
) {
	requireFinanceAdmin(ctx, "Only an Admin can close a term ledger.");

	const schoolProfileId = requireSchoolId(ctx);
	const preview = await previewFinanceTermClose(ctx, input);
	if (preview.blockers.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: preview.blockers[0]?.message ?? "Term ledger cannot be closed.",
		});
	}

	return ctx.db.$transaction(async (tx) => {
		const close = await (tx as any).financeTermLedgerClose.create({
			data: {
				schoolProfileId,
				sessionTermId: preview.ledger.termId,
				schoolSessionId: preview.ledger.sessionId,
				status: "CLOSED",
				summaryJson: preview.ledger.summary,
				closedById: ctx.currentUser?.id,
			},
		});
		const carryForwards: any[] = [];

		for (const row of preview.carryForwards) {
			const carryForward = await (tx as any).financeTermCarryForward.create({
				data: {
					schoolProfileId,
					closeId: close.id,
					streamId: row.streamId,
					nextSessionTermId: row.nextSessionTermId,
					nextSchoolSessionId: row.nextSchoolSessionId,
					amount: row.amount,
					direction: row.direction,
				},
			});
			let ledgerEntryId: string | null = null;

			if (row.nextSessionTermId) {
				const ledgerEntry = await tx.financeLedgerEntry.create({
					data: {
						schoolProfileId,
						streamId: row.streamId,
						direction: row.direction,
						sourceType: "ADJUSTMENT",
						sourceId: carryForward.id,
						amount: row.amount,
						note: `Opening balance from ${preview.ledger.termTitle}`,
						createdById: ctx.currentUser?.id,
						collectedSessionTermId: row.nextSessionTermId,
						collectedSchoolSessionId: row.nextSchoolSessionId,
					},
				});
				ledgerEntryId = ledgerEntry.id;
				await (tx as any).financeTermCarryForward.update({
					where: { id: carryForward.id },
					data: { ledgerEntryId },
				});
			}

			carryForwards.push({ ...carryForward, ledgerEntryId });
		}

		return {
			success: true,
			closeId: close.id,
			status: "CLOSED" as const,
			carryForwards,
			warnings: preview.warnings,
		};
	});
}

export async function reopenFinanceTermLedger(
	ctx: TRPCContext,
	input?: FinanceTermCloseInput,
) {
	requireFinanceAdmin(ctx, "Only an Admin can reopen a term ledger.");

	const schoolProfileId = requireSchoolId(ctx);
	const termId = input?.termId ?? ctx.profile.termId ?? null;
	if (!termId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Term context is required for reopening a term ledger.",
		});
	}

	const close = await (ctx.db as any).financeTermLedgerClose.findFirst({
		where: {
			schoolProfileId,
			sessionTermId: termId,
			status: "CLOSED",
			deletedAt: null,
		},
		select: { id: true },
	});

	if (!close) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Closed term ledger was not found.",
		});
	}

	await (ctx.db as any).financeTermLedgerClose.update({
		where: { id: close.id },
		data: {
			status: "REOPENED",
			reopenedAt: new Date(),
			reopenedById: ctx.currentUser?.id,
		},
	});

	return { success: true, closeId: close.id, status: "REOPENED" as const };
}

export async function getFinanceTermAccountStatement(
	ctx: TRPCContext,
	input: FinanceTermAccountStatementInput,
) {
	requireFinanceReadAccess(ctx);

	const schoolProfileId = requireSchoolId(ctx);
	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);

	if (!termId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Term context is required for account statements.",
		});
	}

	const stream = await ctx.db.financeStream.findFirst({
		where: {
			id: input.streamId,
			schoolProfileId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			slug: true,
			accountType: true,
			description: true,
		},
	});

	if (!stream) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Account was not found.",
		});
	}

	const entries = await ctx.db.financeLedgerEntry.findMany({
		where: {
			schoolProfileId,
			streamId: stream.id,
			deletedAt: null,
			AND: [
				{
					OR: [
						{ collectedSessionTermId: termId },
						{
							collectedSessionTermId: null,
							charge: { sessionTermId: termId },
						},
					],
				},
				...(sessionId
					? [
							{
								OR: [
									{ collectedSchoolSessionId: sessionId },
									{
										collectedSchoolSessionId: null,
										charge: { schoolSessionId: sessionId },
									},
								],
							},
						]
					: []),
			],
		},
		include: {
			charge: {
				select: {
					id: true,
					title: true,
					payerType: true,
					status: true,
					sessionTermId: true,
					schoolSessionId: true,
					student: {
						select: { id: true, name: true, surname: true, otherName: true },
					},
					staffProfile: { select: { id: true, name: true, title: true } },
				},
			},
			payment: {
				select: {
					id: true,
					reference: true,
					method: true,
					status: true,
					paymentDate: true,
				},
			},
			transfer: {
				select: {
					id: true,
					note: true,
					status: true,
					fromStreamId: true,
					toStreamId: true,
				},
			},
		},
		orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
		take: 500,
	});

	const summary = summarizeLedger(entries);
	const statementEntries = entries.map((entry) => ({
		id: entry.id,
		direction: entry.direction === "CREDIT" ? "money-in" : "money-out",
		ledgerDirection: entry.direction,
		sourceType: entry.sourceType,
		sourceId: entry.sourceId,
		amount: toNumber(entry.amount),
		occurredAt: entry.occurredAt,
		collectedSessionTermId: entry.collectedSessionTermId,
		collectedSchoolSessionId: entry.collectedSchoolSessionId,
		paidForSessionTermId: entry.charge?.sessionTermId ?? null,
		paidForSchoolSessionId: entry.charge?.schoolSessionId ?? null,
		note: entry.note,
		payerName:
			studentDisplayName(entry.charge?.student) ||
			entry.charge?.staffProfile?.name ||
			null,
		charge: entry.charge,
		payment: entry.payment,
		transfer: entry.transfer,
	}));

	return {
		termId,
		sessionId,
		account: {
			id: stream.id,
			name: stream.name,
			slug: stream.slug,
			description: stream.description,
			technicalAccountType: stream.accountType,
			labels: {
				moneyIn: "Money In",
				moneyOut: "Money Out",
				availableBalance: "Available Balance",
				deficit: "Deficit",
				needsFunding: "Needs Funding",
			},
		},
		summary: {
			moneyIn: summary.credit,
			moneyOut: summary.debit,
			availableBalance: summary.balance,
			deficit: summary.balance < 0 ? Math.abs(summary.balance) : 0,
			needsFunding: summary.balance < 0,
			entryCount: statementEntries.length,
		},
		entries: statementEntries,
	};
}

export async function getFinanceProjectAccountSummary(
	ctx: TRPCContext,
	input: FinanceProjectAccountSummaryInput,
) {
	const statement = await getFinanceTermAccountStatement(ctx, input);
	const schoolProfileId = requireSchoolId(ctx);
	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);

	const purchases = await ctx.db.financePurchase.findMany({
		where: {
			schoolProfileId,
			streamId: input.streamId,
			deletedAt: null,
			...(termId ? { sessionTermId: termId } : {}),
			...(sessionId ? { schoolSessionId: sessionId } : {}),
			status: { not: "CANCELLED" },
		},
		include: {
			payee: { select: { id: true, name: true, type: true } },
			charge: { select: { id: true, title: true, status: true } },
			payment: { select: { id: true, reference: true, method: true } },
		},
		orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
		take: 200,
	});

	const salesIncome = statement.entries
		.filter(
			(entry) =>
				entry.ledgerDirection === "CREDIT" &&
				entry.sourceType === "PAYMENT" &&
				entry.charge?.payerType === "STUDENT",
		)
		.reduce((sum, entry) => sum + entry.amount, 0);
	const transferredFunding = statement.entries
		.filter(
			(entry) =>
				entry.ledgerDirection === "CREDIT" && entry.sourceType === "TRANSFER",
		)
		.reduce((sum, entry) => sum + entry.amount, 0);
	const purchaseCost = purchases
		.filter((purchase) =>
			["PURCHASE", "VENDOR_BILL", "DIRECT_EXPENSE"].includes(purchase.kind),
		)
		.reduce((sum, purchase) => sum + toNumber(purchase.totalCost), 0);
	const laborCost = purchases
		.filter((purchase) => purchase.kind === "LABOR")
		.reduce((sum, purchase) => sum + toNumber(purchase.totalCost), 0);
	const serviceCost = purchases
		.filter((purchase) => purchase.kind === "SERVICE")
		.reduce((sum, purchase) => sum + toNumber(purchase.totalCost), 0);
	const reimbursementCost = purchases
		.filter((purchase) => purchase.kind === "REIMBURSEMENT")
		.reduce((sum, purchase) => sum + toNumber(purchase.totalCost), 0);
	const totalCost = purchaseCost + laborCost + serviceCost + reimbursementCost;

	return {
		account: statement.account,
		termId: statement.termId,
		sessionId: statement.sessionId,
		summary: {
			...statement.summary,
			transferredFunding,
			salesIncome,
			purchaseCost,
			laborCost,
			serviceCost,
			reimbursementCost,
			totalCost,
			profitLoss: salesIncome - totalCost,
		},
		purchases: purchases.map((purchase) => ({
			id: purchase.id,
			kind: purchase.kind,
			status: purchase.status,
			title: purchase.title,
			description: purchase.description,
			quantity: toNumber(purchase.quantity),
			unitCost: toNumber(purchase.unitCost),
			totalCost: toNumber(purchase.totalCost),
			amountPaid: toNumber(purchase.amountPaid),
			receiptNumber: purchase.receiptNumber,
			reference: purchase.reference,
			occurredAt: purchase.occurredAt,
			payee: purchase.payee,
			charge: purchase.charge,
			payment: purchase.payment,
		})),
		entries: statement.entries,
	};
}

export async function getFinanceStaffHistory(
	ctx: TRPCContext,
	input: FinanceStaffHistoryInput,
) {
	requireFinanceReadAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);

	const staff = await ctx.db.staffProfile.findFirst({
		where: {
			id: input.staffProfileId,
			schoolProfileId,
			deletedAt: null,
		},
		select: { id: true, name: true, title: true, email: true, phone: true },
	});

	if (!staff) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Staff profile was not found.",
		});
	}

	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);
	const [structures, charges] = await Promise.all([
		ctx.db.financePayrollStructure.findMany({
			where: {
				schoolProfileId,
				staffProfileId: staff.id,
				deletedAt: null,
				...(termId ? { sessionTermId: termId } : {}),
				...(sessionId ? { schoolSessionId: sessionId } : {}),
			},
			include: { stream: { select: { id: true, name: true, accountType: true } } },
			orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
		}),
		ctx.db.financeCharge.findMany({
			where: {
				schoolProfileId,
				staffProfileId: staff.id,
				deletedAt: null,
				status: { not: "CANCELLED" },
				...(termId ? { sessionTermId: termId } : {}),
				...(sessionId ? { schoolSessionId: sessionId } : {}),
			},
			include: {
				stream: { select: { id: true, name: true, accountType: true } },
				payrollStructure: {
					select: { id: true, title: true, cadence: true },
				},
				allocations: {
					include: {
						payment: {
							select: {
								id: true,
								amount: true,
								paymentDate: true,
								method: true,
								reference: true,
								status: true,
							},
						},
					},
				},
			},
			orderBy: [{ createdAt: "desc" }],
			take: 200,
		}),
	]);

	const normalizedCharges = charges.map((charge) => {
		const amount = toNumber(charge.amount);
		const amountPaid = toNumber(charge.amountPaid);
		return {
			id: charge.id,
			title: charge.title,
			description: charge.description,
			amount,
			amountPaid,
			outstanding: amount - amountPaid,
			status: charge.status,
			stream: charge.stream,
			payrollStructure: charge.payrollStructure,
			receipts: charge.allocations.map((allocation) => ({
				id: allocation.payment.id,
				amount: toNumber(allocation.amount),
				paymentDate: allocation.payment.paymentDate,
				method: allocation.payment.method,
				reference: allocation.payment.reference,
				status: allocation.payment.status,
			})),
		};
	});

	return {
		staff,
		termId,
		sessionId,
		payrollStructures: structures.map((structure) => ({
			...structure,
			baseAmount: toNumber(structure.baseAmount),
			allowanceAmount: toNumber(structure.allowanceAmount),
			deductionAmount: toNumber(structure.deductionAmount),
			advanceAmount: toNumber(structure.advanceAmount),
			bonusAmount: toNumber(structure.bonusAmount),
			netAmount: toNumber(structure.netAmount),
		})),
		charges: normalizedCharges,
		summary: {
			totalDue: normalizedCharges.reduce((sum, charge) => sum + charge.amount, 0),
			totalPaid: normalizedCharges.reduce(
				(sum, charge) => sum + charge.amountPaid,
				0,
			),
			totalOutstanding: normalizedCharges.reduce(
				(sum, charge) => sum + charge.outstanding,
				0,
			),
			chargeCount: normalizedCharges.length,
			activeStructureCount: structures.filter((structure) => structure.isActive)
				.length,
		},
	};
}

export async function getFinancePayeeHistory(
	ctx: TRPCContext,
	input: FinancePayeeHistoryInput,
) {
	requireFinanceReadAccess(ctx);
	const schoolProfileId = requireSchoolId(ctx);
	const payee = await ctx.db.financePayee.findFirst({
		where: {
			id: input.payeeId,
			schoolProfileId,
			deletedAt: null,
		},
		select: { id: true, name: true, type: true, phone: true, email: true },
	});

	if (!payee) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Finance payee was not found.",
		});
	}

	const termId = input.termId ?? ctx.profile.termId ?? null;
	const sessionId =
		input.sessionId ?? (input.termId ? null : ctx.profile.sessionId ?? null);
	const [purchases, charges] = await Promise.all([
		ctx.db.financePurchase.findMany({
			where: {
				schoolProfileId,
				payeeId: payee.id,
				deletedAt: null,
				...(termId ? { sessionTermId: termId } : {}),
				...(sessionId ? { schoolSessionId: sessionId } : {}),
			},
			include: {
				stream: { select: { id: true, name: true, accountType: true } },
				charge: { select: { id: true, title: true, status: true } },
				payment: {
					select: {
						id: true,
						reference: true,
						method: true,
						paymentDate: true,
						status: true,
					},
				},
			},
			orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
			take: 200,
		}),
		ctx.db.financeCharge.findMany({
			where: {
				schoolProfileId,
				payeeId: payee.id,
				deletedAt: null,
				status: { not: "CANCELLED" },
				...(termId ? { sessionTermId: termId } : {}),
				...(sessionId ? { schoolSessionId: sessionId } : {}),
			},
			include: {
				stream: { select: { id: true, name: true, accountType: true } },
				allocations: {
					include: {
						payment: {
							select: {
								id: true,
								amount: true,
								paymentDate: true,
								method: true,
								reference: true,
								status: true,
							},
						},
					},
				},
			},
			orderBy: [{ createdAt: "desc" }],
			take: 200,
		}),
	]);

	const normalizedPurchases = purchases.map((purchase) => ({
		id: purchase.id,
		kind: purchase.kind,
		status: purchase.status,
		title: purchase.title,
		description: purchase.description,
		stream: purchase.stream,
		totalCost: toNumber(purchase.totalCost),
		amountPaid: toNumber(purchase.amountPaid),
		outstanding: toNumber(purchase.totalCost) - toNumber(purchase.amountPaid),
		receiptNumber: purchase.receiptNumber,
		reference: purchase.reference,
		occurredAt: purchase.occurredAt,
		charge: purchase.charge,
		payment: purchase.payment,
	}));
	const normalizedCharges = charges.map((charge) => ({
		id: charge.id,
		title: charge.title,
		description: charge.description,
		stream: charge.stream,
		amount: toNumber(charge.amount),
		amountPaid: toNumber(charge.amountPaid),
		outstanding: toNumber(charge.amount) - toNumber(charge.amountPaid),
		status: charge.status,
		receipts: charge.allocations.map((allocation) => ({
			id: allocation.payment.id,
			amount: toNumber(allocation.amount),
			paymentDate: allocation.payment.paymentDate,
			method: allocation.payment.method,
			reference: allocation.payment.reference,
			status: allocation.payment.status,
		})),
	}));

	return {
		payee,
		termId,
		sessionId,
		purchases: normalizedPurchases,
		charges: normalizedCharges,
		summary: {
			totalCost: normalizedPurchases.reduce(
				(sum, purchase) => sum + purchase.totalCost,
				0,
			),
			totalPaid: normalizedPurchases.reduce(
				(sum, purchase) => sum + purchase.amountPaid,
				0,
			),
			totalOutstanding: normalizedPurchases.reduce(
				(sum, purchase) => sum + purchase.outstanding,
				0,
			),
			purchaseCount: normalizedPurchases.length,
			chargeCount: normalizedCharges.length,
		},
	};
}

export async function getFinanceOverview(ctx: TRPCContext) {
	const streams = await listFinanceStreams(ctx);
	return {
		streams,
		summary: {
			totalCredit: streams.reduce((sum, stream) => sum + stream.credit, 0),
			totalDebit: streams.reduce((sum, stream) => sum + stream.debit, 0),
			totalBalance: streams.reduce((sum, stream) => sum + stream.balance, 0),
		},
	};
}

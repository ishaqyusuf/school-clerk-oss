import { Prisma } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../trpc/init";
import type {
	FinanceChargeInput,
	FinanceItemInput,
	FinancePaymentInput,
	FinanceStreamDetailsInput,
	FinanceStreamInput,
	FinanceStreamQuery,
	FinanceTransferInput,
} from "../../trpc/schemas/finance";

type FinanceDb = Pick<TRPCContext["db"], "financeStream">;

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

async function reconcileStudentTermChargesForForm(
	tx: Prisma.TransactionClient,
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
	tx: Prisma.TransactionClient,
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
	const streams = await ctx.db.financeStream.findMany({
		where: { schoolProfileId },
		include: {
			ledgerEntries: {
				where: {
					...(input?.termId ? { charge: { sessionTermId: input.termId } } : {}),
					...(input?.sessionId
						? { charge: { schoolSessionId: input.sessionId } }
						: {}),
				},
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
	const schoolProfileId = requireSchoolId(ctx);
	const slug = input.slug?.trim() || slugify(input.name);

	if (input.id) {
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

		const item = input.id
			? await tx.financeItem.update({ where: { id: input.id }, data })
			: await tx.financeItem.create({ data });

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

export async function listFinanceItems(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const items = await ctx.db.financeItem.findMany({
		where: { schoolProfileId },
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
	const schoolProfileId = requireSchoolId(ctx);

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
				? { status: (input.status ?? statusFromCollectionFilter) as never }
				: { status: { not: "CANCELLED" } }),
			...(collectionStatus ? { collectionStatus: collectionStatus as never } : {}),
		},
		include: {
			stream: { select: { id: true, name: true, accountType: true } },
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
			walletId: charge.streamId,
			billPaymentId: null,
			billPayment: null,
			fees: [],
			status: charge.status,
			collectionStatus: charge.collectionStatus,
			payerType: charge.payerType,
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

		const payment = await tx.financePayment.create({
			data: {
				schoolProfileId,
				streamId: charge.streamId,
				payerType: charge.payerType,
				studentId: charge.studentId,
				staffProfileId: charge.staffProfileId,
				amount,
				paymentDate: input.paymentDate ?? new Date(),
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

		await tx.financeCharge.update({
			where: { id: charge.id },
			data: {
				amountPaid: totalPaid,
				status: nextStatus,
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

export async function transferFinanceFunds(
	ctx: TRPCContext,
	input: FinanceTransferInput,
) {
	const schoolProfileId = requireSchoolId(ctx);

	if (input.fromStreamId === input.toStreamId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Transfer source and destination streams must be different.",
		});
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

export async function listFinancePayments(ctx: TRPCContext) {
	const schoolProfileId = requireSchoolId(ctx);
	const payments = await ctx.db.financePayment.findMany({
		where: { schoolProfileId },
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

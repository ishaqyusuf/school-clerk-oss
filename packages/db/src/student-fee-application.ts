import type { Prisma } from "./generated/client";

type AppliedFinanceCharge = {
	amount: number | string | Prisma.Decimal;
	id: string;
	itemId: string | null;
	streamId: string;
	title: string;
};

export type AdmissionType = "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
export type StudentAudience =
	| "ALL_STUDENTS"
	| "NEW_ADMISSIONS_ONLY"
	| "RETURNING_STUDENTS_ONLY";
export type StudentGender = "Male" | "Female";
export type StudentGenderAudience = "ALL_GENDERS" | "MALE_ONLY" | "FEMALE_ONLY";

type FinanceItemApplicability = {
	id: string;
	collectable: boolean;
	isActive: boolean;
	studentAudience: StudentAudience;
	studentGenderAudience: StudentGenderAudience;
	schoolSessionId: string | null;
	sessionTermId: string | null;
	applicableClassroomDepartmentIds: string[];
};

type StudentTermApplicability = {
	admissionType: AdmissionType;
	studentGender: StudentGender;
	classroomDepartmentId: string | null;
	schoolSessionId: string | null;
	sessionTermId: string | null;
};

export function applicableStudentAudiences(
	admissionType: AdmissionType | null | undefined,
): StudentAudience[] {
	return [
		"ALL_STUDENTS",
		...(admissionType === "NEW_ADMISSION"
			? (["NEW_ADMISSIONS_ONLY"] as const)
			: []),
		...(admissionType === "RETURNING"
			? (["RETURNING_STUDENTS_ONLY"] as const)
			: []),
	];
}

export function applicableStudentGenderAudiences(
	studentGender: StudentGender | null | undefined,
): StudentGenderAudience[] {
	return [
		"ALL_GENDERS",
		...(studentGender === "Male" ? (["MALE_ONLY"] as const) : []),
		...(studentGender === "Female" ? (["FEMALE_ONLY"] as const) : []),
	];
}

type CandidateFinanceItem = Prisma.FinanceItemGetPayload<{
	include: { stream: true; applicableClasses: true };
}>;
type ExistingFinanceCharge = Prisma.FinanceChargeGetPayload<{
	select: {
		id: true;
		itemId: true;
		amountPaid: true;
		assignmentSource: true;
	};
}>;

type StudentFeeApplicationDb = {
	financeItem: {
		findMany(
			args: Prisma.FinanceItemFindManyArgs,
		): Promise<CandidateFinanceItem[]>;
	};
	financeCharge: {
		findFirst(
			args: Prisma.FinanceChargeFindFirstArgs,
		): Promise<{ id: string } | null>;
		findMany(
			args: Prisma.FinanceChargeFindManyArgs,
		): Promise<ExistingFinanceCharge[]>;
		create(args: Prisma.FinanceChargeCreateArgs): Promise<AppliedFinanceCharge>;
		updateMany(
			args: Prisma.FinanceChargeUpdateManyArgs,
		): Promise<{ count: number }>;
	};
};

async function findCandidateFinanceItems(
	tx: StudentFeeApplicationDb,
	input: {
		schoolProfileId: string;
		schoolSessionId: string;
		sessionTermId: string;
		classroomDepartmentId: string;
	},
) {
	return tx.financeItem.findMany({
		where: {
			schoolProfileId: input.schoolProfileId,
			deletedAt: null,
			isActive: true,
			OR: [
				{ schoolSessionId: input.schoolSessionId },
				{ schoolSessionId: null },
			],
			AND: [
				{
					OR: [{ sessionTermId: input.sessionTermId }, { sessionTermId: null }],
				},
				{
					OR: [
						{ applicableClasses: { none: { deletedAt: null } } },
						{
							applicableClasses: {
								some: {
									deletedAt: null,
									classRoomDepartmentId: input.classroomDepartmentId,
								},
							},
						},
					],
				},
			],
		},
		include: { stream: true, applicableClasses: true },
	});
}

function normalizeFinanceItemApplicability(
	item: CandidateFinanceItem,
): FinanceItemApplicability {
	return {
		id: item.id,
		collectable: item.collectable,
		isActive: item.isActive,
		studentAudience: item.studentAudience,
		studentGenderAudience: item.studentGenderAudience,
		schoolSessionId: item.schoolSessionId,
		sessionTermId: item.sessionTermId,
		applicableClassroomDepartmentIds: item.applicableClasses
			.filter((row) => !row.deletedAt)
			.map((row) => row.classRoomDepartmentId),
	};
}

export function isFinanceItemApplicableToStudentTerm(
	item: FinanceItemApplicability,
	term: StudentTermApplicability,
	options: { selectedOptionalFeeItemIds?: readonly string[] } = {},
) {
	if (!item.isActive) return false;
	if (item.schoolSessionId && item.schoolSessionId !== term.schoolSessionId) {
		return false;
	}
	if (item.sessionTermId && item.sessionTermId !== term.sessionTermId) {
		return false;
	}
	if (
		item.applicableClassroomDepartmentIds.length > 0 &&
		(!term.classroomDepartmentId ||
			!item.applicableClassroomDepartmentIds.includes(
				term.classroomDepartmentId,
			))
	) {
		return false;
	}

	if (
		!applicableStudentAudiences(term.admissionType).includes(
			item.studentAudience,
		)
	) {
		return false;
	}
	if (
		!applicableStudentGenderAudiences(term.studentGender).includes(
			item.studentGenderAudience,
		)
	)
		return false;

	return (
		item.collectable ||
		options.selectedOptionalFeeItemIds?.includes(item.id) === true
	);
}

export async function applyFeeHistoriesToStudentTermForm(
	client: unknown,
	input: {
		schoolProfileId: string;
		studentId: string;
		studentTermFormId: string;
		schoolSessionId: string;
		sessionTermId: string;
		classroomDepartmentId: string;
		admissionType: AdmissionType;
		studentGender: StudentGender;
		selectedOptionalFeeItemIds?: readonly string[];
	},
): Promise<{
	applied: number;
	skipped: number;
	total: number;
	charges: AppliedFinanceCharge[];
}> {
	const tx = client as StudentFeeApplicationDb;
	const items = await findCandidateFinanceItems(tx, input);

	const applicableItems = items.filter((item) =>
		isFinanceItemApplicableToStudentTerm(
			normalizeFinanceItemApplicability(item),
			{
				admissionType: input.admissionType,
				studentGender: input.studentGender,
				classroomDepartmentId: input.classroomDepartmentId,
				schoolSessionId: input.schoolSessionId,
				sessionTermId: input.sessionTermId,
			},
			{ selectedOptionalFeeItemIds: input.selectedOptionalFeeItemIds },
		),
	);

	const createdCharges: AppliedFinanceCharge[] = [];
	let skipped = 0;
	for (const item of applicableItems) {
		const existing = await tx.financeCharge.findFirst({
			where: {
				schoolProfileId: input.schoolProfileId,
				payerType: "STUDENT",
				studentId: input.studentId,
				studentTermFormId: input.studentTermFormId,
				itemId: item.id,
				deletedAt: null,
				status: { not: "CANCELLED" },
			},
			select: { id: true },
		});
		if (existing) {
			skipped++;
			continue;
		}

		const charge = await tx.financeCharge.create({
			data: {
				schoolProfileId: input.schoolProfileId,
				streamId: item.streamId,
				itemId: item.id,
				payerType: "STUDENT",
				studentId: input.studentId,
				studentTermFormId: input.studentTermFormId,
				classroomDepartmentId: input.classroomDepartmentId,
				schoolSessionId: input.schoolSessionId,
				sessionTermId: input.sessionTermId,
				title: item.name,
				description: item.description,
				amount: item.amount,
				collectionStatus: "NOT_COLLECTED",
				assignmentSource: item.collectable
					? "REQUIRED_AUTO"
					: "OPTIONAL_SELECTED",
			},
		});
		createdCharges.push(charge);
	}

	return {
		applied: createdCharges.length,
		skipped,
		total: applicableItems.length,
		charges: createdCharges,
	};
}

export async function reconcileFeeHistoriesForStudentTermForm(
	client: unknown,
	input: {
		schoolProfileId: string;
		studentId: string;
		studentTermFormId: string;
		schoolSessionId: string;
		sessionTermId: string;
		classroomDepartmentId: string;
		admissionType: AdmissionType;
		studentGender: StudentGender;
	},
) {
	const tx = client as StudentFeeApplicationDb;
	const existingCharges = await tx.financeCharge.findMany({
		where: {
			schoolProfileId: input.schoolProfileId,
			payerType: "STUDENT",
			studentId: input.studentId,
			studentTermFormId: input.studentTermFormId,
			itemId: { not: null },
			deletedAt: null,
			status: { not: "CANCELLED" },
		},
		select: {
			id: true,
			itemId: true,
			amountPaid: true,
			assignmentSource: true,
		},
	});
	const selectedOptionalItemIds = existingCharges
		.filter((charge) => charge.assignmentSource === "OPTIONAL_SELECTED")
		.map((charge) => charge.itemId)
		.filter((id: string | null): id is string => Boolean(id));
	const items = await findCandidateFinanceItems(tx, input);
	const applicableItemIds = new Set(
		items
			.filter((item) =>
				isFinanceItemApplicableToStudentTerm(
					normalizeFinanceItemApplicability(item),
					input,
					{ selectedOptionalFeeItemIds: selectedOptionalItemIds },
				),
			)
			.map((item) => item.id),
	);

	const application = await applyFeeHistoriesToStudentTermForm(tx, input);
	const staleUnpaidIds = existingCharges
		.filter(
			(charge) =>
				charge.itemId &&
				!applicableItemIds.has(charge.itemId) &&
				(charge.assignmentSource === "REQUIRED_AUTO" ||
					charge.assignmentSource === "OPTIONAL_SELECTED") &&
				Number(charge.amountPaid) <= 0,
		)
		.map((charge) => charge.id);

	let cancelled = 0;
	if (staleUnpaidIds.length) {
		const result = await tx.financeCharge.updateMany({
			where: { id: { in: staleUnpaidIds } },
			data: {
				status: "CANCELLED",
				collectionStatus: "NOT_REQUIRED",
				cancelledAt: new Date(),
				cancellationReason: "Fee is no longer applicable to this student term.",
			},
		});
		cancelled = result.count;
	}

	return { ...application, cancelled };
}

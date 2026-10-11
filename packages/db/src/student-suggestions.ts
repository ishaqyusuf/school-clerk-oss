import { classroomDisplayName } from "@school-clerk/utils/classroom-name";
import {
	type StudentNameFormat,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import type { Prisma } from "./generated/client";
import type { Database } from "./prisma";

export type StudentSuggestionSearch = {
	name: string;
	surname: string;
	otherName: string;
};

export function studentSuggestionGroups(
	input: StudentSuggestionSearch,
): Prisma.StudentsWhereInput[] {
	const parts = (["name", "surname", "otherName"] as const).flatMap((key) =>
		input[key].trim() ? [{ key, value: input[key].trim() }] : [],
	);
	if (!parts.length) return [];
	const exact: Prisma.StudentsWhereInput = {
		AND: parts.map(({ key, value }) => ({
			[key]: { equals: value, mode: "insensitive" },
		})),
	};
	const contains = parts.map(({ key, value }) => ({
		[key]: { contains: value, mode: "insensitive" },
	}));
	const all: Prisma.StudentsWhereInput = { AND: contains };
	return [
		exact,
		{ AND: [all, { NOT: exact }] },
		{ AND: [{ OR: contains }, { NOT: all }] },
	];
}

export async function getStudentSuggestions(
	db: Pick<Database, "students">,
	input: StudentSuggestionSearch & {
		schoolId: string;
		sessionId: string;
		termId: string;
		nameFormat?: StudentNameFormat;
		cursor?: string | null;
		pageSize: number;
	},
) {
	const groups = studentSuggestionGroups(input);
	const base = {
		schoolProfileId: input.schoolId,
		deletedAt: null,
	} satisfies Prisma.StudentsWhereInput;
	const counts = await Promise.all(
		groups.map((group) => db.students.count({ where: { AND: [base, group] } })),
	);
	const [startGroup = "0", startOffset = "0"] = (input.cursor ?? "0:0").split(
		":",
	);
	let groupIndex = Number(startGroup);
	let offset = Number(startOffset);
	const rows = [];
	while (groupIndex < groups.length && rows.length < input.pageSize) {
		const group = groups[groupIndex];
		if (!group) break;
		const take = Math.min(
			input.pageSize - rows.length,
			Math.max(0, (counts[groupIndex] ?? 0) - offset),
		);
		if (take > 0) {
			const matches = await db.students.findMany({
				where: { AND: [base, group] },
				skip: offset,
				take,
				orderBy: { id: "asc" },
				select: {
					id: true,
					name: true,
					surname: true,
					otherName: true,
					dob: true,
					guardians: {
						where: {
							deletedAt: null,
							guardian: { schoolProfileId: input.schoolId, deletedAt: null },
						},
						orderBy: [{ createdAt: "asc" }, { id: "asc" }],
						take: 1,
						select: { guardian: { select: { name: true } } },
					},
					sessionForms: {
						where: {
							schoolProfileId: input.schoolId,
							deletedAt: null,
							schoolSessionId: input.sessionId,
							schoolSession: { schoolId: input.schoolId, deletedAt: null },
						},
						select: {
							termForms: {
								where: {
									schoolProfileId: input.schoolId,
									deletedAt: null,
									schoolSessionId: input.sessionId,
									sessionTermId: input.termId,
									registrationReviewStatus: { not: "REJECTED" },
									sessionTerm: {
										schoolId: input.schoolId,
										sessionId: input.sessionId,
										deletedAt: null,
									},
								},
								orderBy: { id: "asc" },
								take: 2,
								select: {
									id: true,
									studentId: true,
									registrationReviewStatus: true,
									classroomDepartment: {
										select: {
											id: true,
											departmentName: true,
											schoolProfileId: true,
											deletedAt: true,
											classRoom: {
												select: {
													name: true,
													schoolProfileId: true,
													schoolSessionId: true,
													deletedAt: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});
			for (const student of matches) {
				const forms = student.sessionForms.flatMap(
					(session) => session.termForms,
				);
				const needsReview =
					forms.length > 1 ||
					forms.some(
						(form) => form.studentId !== null && form.studentId !== student.id,
					);
				const form = !needsReview && forms.length === 1 ? forms[0] : undefined;
				const department = form?.classroomDepartment;
				const classroom = department?.classRoom;
				const validClass =
					department?.schoolProfileId === input.schoolId &&
					!department.deletedAt &&
					classroom?.schoolProfileId === input.schoolId &&
					classroom.schoolSessionId === input.sessionId &&
					!classroom.deletedAt;
				rows.push({
					id: student.id,
					studentName: formatStudentName(student, input.nameFormat),
					dob: student.dob,
					guardianName: student.guardians[0]?.guardian.name ?? null,
					match:
						groupIndex === 0
							? ("exact" as const)
							: groupIndex === 1
								? ("name" as const)
								: ("partial" as const),
					status: needsReview
						? ("needs review" as const)
						: form?.registrationReviewStatus === "PENDING"
							? ("pending approval" as const)
							: form
								? ("enrolled" as const)
								: ("not enrolled" as const),
					termFormId:
						validClass && form?.registrationReviewStatus === "APPROVED"
							? form.id
							: null,
					classroomId: validClass ? department.id : null,
					classroomName: validClass
						? classroomDisplayName({
								className: classroom.name,
								departmentName: department.departmentName,
							})
						: null,
				});
			}
			offset += matches.length;
			if (matches.length < take) {
				groupIndex += 1;
				offset = 0;
				continue;
			}
		}
		if (offset >= (counts[groupIndex] ?? 0)) {
			groupIndex += 1;
			offset = 0;
		}
	}
	while (groupIndex < groups.length && offset >= (counts[groupIndex] ?? 0)) {
		groupIndex += 1;
		offset = 0;
	}
	return {
		data: rows,
		meta: {
			count: counts.reduce((sum, count) => sum + count, 0),
			matchingCount: (counts[0] ?? 0) + (counts[1] ?? 0),
			cursor: groupIndex < groups.length ? `${groupIndex}:${offset}` : null,
		},
	};
}

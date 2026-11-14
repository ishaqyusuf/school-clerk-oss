import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
import { getTeacherAcademicAccess } from "../../lib/teacher-authorization";

type TeacherAcademicAccess = NonNullable<
	Awaited<ReturnType<typeof getTeacherAcademicAccess>>
>;

export type SubjectRecordingProgress = {
	/** Scores recorded (non-null) for roster students in this subject. */
	recorded: number;
	/** Scores expected: students × this subject's assessment columns. */
	expected: number;
};

export type ClassroomRecordingProgress = {
	/** Students on the classroom's term roster (same filter as the report sheet). */
	students: number;
	/** Scoreable assessment columns in the classroom's term subjects. */
	assessments: number;
	/** Scores recorded (non-null) for roster students. */
	recorded: number;
	/** Scores expected: students × assessment columns. */
	expected: number;
	/** Per department-subject counts; subjects without columns are absent. */
	subjects: Record<string, SubjectRecordingProgress>;
};

/** Pure aggregation, kept separate from Prisma so it can be unit-tested. */
export function summarizeClassroomRecordingProgress({
	departmentIds,
	studentCounts,
	assessments,
	recordCounts,
}: {
	departmentIds: string[];
	studentCounts: Array<{ departmentId: string | null; count: number }>;
	assessments: Array<{
		id: number;
		departmentId: string | null;
		subjectId?: string | null;
	}>;
	recordCounts: Array<{ assessmentId: number | null; count: number }>;
}) {
	const students = new Map<string, number>();
	for (const row of studentCounts) {
		if (row.departmentId) students.set(row.departmentId, row.count);
	}
	const assessmentById = new Map<
		number,
		{ departmentId: string; subjectId: string | null }
	>();
	const assessmentCounts = new Map<string, number>();
	const subjectAssessmentCounts = new Map<string, Map<string, number>>();
	for (const assessment of assessments) {
		if (!assessment.departmentId) continue;
		const subjectId = assessment.subjectId ?? null;
		assessmentById.set(assessment.id, {
			departmentId: assessment.departmentId,
			subjectId,
		});
		assessmentCounts.set(
			assessment.departmentId,
			(assessmentCounts.get(assessment.departmentId) ?? 0) + 1,
		);
		if (subjectId) {
			const bySubject =
				subjectAssessmentCounts.get(assessment.departmentId) ?? new Map();
			bySubject.set(subjectId, (bySubject.get(subjectId) ?? 0) + 1);
			subjectAssessmentCounts.set(assessment.departmentId, bySubject);
		}
	}
	const recorded = new Map<string, number>();
	const subjectRecorded = new Map<string, number>();
	for (const row of recordCounts) {
		const assessment =
			row.assessmentId == null
				? undefined
				: assessmentById.get(row.assessmentId);
		if (!assessment) continue;
		recorded.set(
			assessment.departmentId,
			(recorded.get(assessment.departmentId) ?? 0) + row.count,
		);
		if (assessment.subjectId) {
			subjectRecorded.set(
				assessment.subjectId,
				(subjectRecorded.get(assessment.subjectId) ?? 0) + row.count,
			);
		}
	}

	const progress = new Map<string, ClassroomRecordingProgress>();
	for (const departmentId of departmentIds) {
		const studentCount = students.get(departmentId) ?? 0;
		const assessmentCount = assessmentCounts.get(departmentId) ?? 0;
		const expected = studentCount * assessmentCount;
		const subjects: Record<string, SubjectRecordingProgress> = {};
		for (const [subjectId, columns] of subjectAssessmentCounts.get(
			departmentId,
		) ?? []) {
			const subjectExpected = studentCount * columns;
			subjects[subjectId] = {
				recorded: Math.min(
					subjectRecorded.get(subjectId) ?? 0,
					subjectExpected,
				),
				expected: subjectExpected,
			};
		}
		progress.set(departmentId, {
			students: studentCount,
			assessments: assessmentCount,
			// A record can outlive a roster change; never report more than expected.
			recorded: Math.min(recorded.get(departmentId) ?? 0, expected),
			expected,
			subjects,
		});
	}
	return progress;
}

/**
 * Per-classroom score-entry progress for one term. Teachers only count the
 * subjects they are assigned, matching what their recording table shows.
 */
export async function getClassroomRecordingProgress(
	ctx: TRPCContext,
	{
		sessionTermId,
		departmentIds,
		teacherAccess,
	}: {
		sessionTermId: string;
		departmentIds: string[];
		/** Already-resolved teacher access; `null` means not a teacher. */
		teacherAccess: TeacherAcademicAccess | null;
	},
) {
	const schoolId = ctx.profile.schoolId;
	if (!schoolId || !departmentIds.length) {
		return new Map<string, ClassroomRecordingProgress>();
	}
	const rosterWhere = {
		sessionTermId,
		deletedAt: null,
		schoolProfileId: schoolId,
		registrationReviewStatus: { not: "REJECTED" as const },
		classroomDepartmentId: { in: departmentIds },
		student: { deletedAt: null, schoolProfileId: schoolId },
	};

	const [studentCounts, assessments] = await Promise.all([
		ctx.db.studentTermForm.groupBy({
			by: ["classroomDepartmentId"],
			where: rosterWhere,
			_count: { _all: true },
		}),
		ctx.db.classroomSubjectAssessment.findMany({
			where: {
				deletedAt: null,
				isGroup: false,
				departmentSubject: {
					deletedAt: null,
					sessionTermId,
					classRoomDepartmentId: { in: departmentIds },
					...(teacherAccess
						? { id: { in: teacherAccess.departmentSubjectIds } }
						: {}),
				},
			},
			select: {
				id: true,
				departmentSubject: {
					select: { id: true, classRoomDepartmentId: true },
				},
			},
		}),
	]);
	const recordCounts = assessments.length
		? await ctx.db.studentAssessmentRecord.groupBy({
				by: ["classSubjectAssessmentId"],
				where: {
					deletedAt: null,
					obtained: { not: null },
					classSubjectAssessmentId: {
						in: assessments.map((assessment) => assessment.id),
					},
					studentTermForm: rosterWhere,
				},
				_count: { _all: true },
			})
		: [];

	return summarizeClassroomRecordingProgress({
		departmentIds,
		studentCounts: studentCounts.map((row) => ({
			departmentId: row.classroomDepartmentId,
			count: row._count._all,
		})),
		assessments: assessments.map((assessment) => ({
			id: assessment.id,
			departmentId: assessment.departmentSubject?.classRoomDepartmentId ?? null,
			subjectId: assessment.departmentSubject?.id ?? null,
		})),
		recordCounts: recordCounts.map((row) => ({
			assessmentId: row.classSubjectAssessmentId,
			count: row._count._all,
		})),
	});
}

export const recordingProgressSchema = z.object({
	termId: z.string(),
	/** Classrooms to count; ids outside the caller's access are dropped. */
	departmentIds: z.array(z.string()).max(500),
});

/**
 * Score-entry progress for the given classrooms of one term, keyed by
 * classroom id. Kept apart from the filter options so the options can be
 * cached for long while progress is refreshed per classroom after saves.
 */
export async function getRecordingProgress(
	ctx: TRPCContext,
	input: z.infer<typeof recordingProgressSchema>,
) {
	const schoolId = ctx.profile.schoolId;
	const requested = Array.from(new Set(input.departmentIds));
	if (!schoolId || !requested.length) {
		return { termId: input.termId, classrooms: {} };
	}
	const teacherAccess = await getTeacherAcademicAccess(ctx, input.termId);
	const departmentIds = teacherAccess
		? requested.filter((id) =>
				teacherAccess.classRoomDepartmentIds.includes(id),
			)
		: (
				await ctx.db.classRoomDepartment.findMany({
					where: {
						id: { in: requested },
						schoolProfileId: schoolId,
						deletedAt: null,
					},
					select: { id: true },
				})
			).map((department) => department.id);
	const progress = await getClassroomRecordingProgress(ctx, {
		sessionTermId: input.termId,
		departmentIds,
		teacherAccess,
	});
	return {
		termId: input.termId,
		classrooms: Object.fromEntries(progress) as Record<
			string,
			ClassroomRecordingProgress
		>,
	};
}

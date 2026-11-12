import type { TRPCContext } from "@api/trpc/init";
import { getTeacherAcademicAccess } from "../../lib/teacher-authorization";

export type ClassroomRecordingProgress = {
	/** Students on the classroom's term roster (same filter as the report sheet). */
	students: number;
	/** Scoreable assessment columns in the classroom's term subjects. */
	assessments: number;
	/** Scores recorded (non-null) for roster students. */
	recorded: number;
	/** Scores expected: students × assessment columns. */
	expected: number;
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
	assessments: Array<{ id: number; departmentId: string | null }>;
	recordCounts: Array<{ assessmentId: number | null; count: number }>;
}) {
	const students = new Map<string, number>();
	for (const row of studentCounts) {
		if (row.departmentId) students.set(row.departmentId, row.count);
	}
	const departmentByAssessment = new Map<number, string>();
	const assessmentCounts = new Map<string, number>();
	for (const assessment of assessments) {
		if (!assessment.departmentId) continue;
		departmentByAssessment.set(assessment.id, assessment.departmentId);
		assessmentCounts.set(
			assessment.departmentId,
			(assessmentCounts.get(assessment.departmentId) ?? 0) + 1,
		);
	}
	const recorded = new Map<string, number>();
	for (const row of recordCounts) {
		const departmentId =
			row.assessmentId == null
				? undefined
				: departmentByAssessment.get(row.assessmentId);
		if (!departmentId) continue;
		recorded.set(departmentId, (recorded.get(departmentId) ?? 0) + row.count);
	}

	const progress = new Map<string, ClassroomRecordingProgress>();
	for (const departmentId of departmentIds) {
		const studentCount = students.get(departmentId) ?? 0;
		const assessmentCount = assessmentCounts.get(departmentId) ?? 0;
		const expected = studentCount * assessmentCount;
		progress.set(departmentId, {
			students: studentCount,
			assessments: assessmentCount,
			// A record can outlive a roster change; never report more than expected.
			recorded: Math.min(recorded.get(departmentId) ?? 0, expected),
			expected,
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
	}: { sessionTermId: string; departmentIds: string[] },
) {
	const schoolId = ctx.profile.schoolId;
	if (!schoolId || !departmentIds.length) {
		return new Map<string, ClassroomRecordingProgress>();
	}
	const teacherAccess = await getTeacherAcademicAccess(ctx, sessionTermId);
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
				departmentSubject: { select: { classRoomDepartmentId: true } },
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
		})),
		recordCounts: recordCounts.map((row) => ({
			assessmentId: row.classSubjectAssessmentId,
			count: row._count._all,
		})),
	});
}

/** Adds `recordingProgress` to each classroom option for the given term. */
export async function withClassroomRecordingProgress<T extends { id: string }>(
	ctx: TRPCContext,
	sessionTermId: string | null,
	classrooms: T[],
) {
	if (!sessionTermId || !classrooms.length) {
		return classrooms.map((classroom) => ({
			...classroom,
			recordingProgress: null as ClassroomRecordingProgress | null,
		}));
	}
	const progress = await getClassroomRecordingProgress(ctx, {
		sessionTermId,
		departmentIds: classrooms.map((classroom) => classroom.id),
	});
	return classrooms.map((classroom) => ({
		...classroom,
		recordingProgress: (progress.get(classroom.id) ??
			null) as ClassroomRecordingProgress | null,
	}));
}

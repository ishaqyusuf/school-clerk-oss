import type { TRPCContext } from "@api/trpc/init";

export type RecordingSubjectOption = {
	/** Department-subject id, the same id the recording table selects. */
	id: string;
	title: string;
	/** Scoreable (non-group) assessment columns. */
	assessments: number;
};

/**
 * Subject list for every classroom of a term, in one query. It feeds the
 * recording filter so a classroom picked in the filter shows its subjects
 * before the heavy report sheet loads. `departmentSubjectIds` limits a
 * teacher to their assigned subjects; `null` means no limit.
 */
export async function getClassroomSubjectOptions(
	ctx: TRPCContext,
	{
		sessionTermId,
		departmentIds,
		departmentSubjectIds,
	}: {
		sessionTermId: string;
		departmentIds: string[];
		departmentSubjectIds: string[] | null;
	},
) {
	const byClassroom = new Map<string, RecordingSubjectOption[]>();
	if (!departmentIds.length || departmentSubjectIds?.length === 0) {
		return byClassroom;
	}
	const subjects = await ctx.db.departmentSubject.findMany({
		where: {
			deletedAt: null,
			sessionTermId,
			classRoomDepartmentId: { in: departmentIds },
			...(departmentSubjectIds ? { id: { in: departmentSubjectIds } } : {}),
		},
		select: {
			id: true,
			classRoomDepartmentId: true,
			subject: { select: { title: true } },
			_count: {
				select: { assessments: { where: { deletedAt: null, isGroup: false } } },
			},
		},
	});
	for (const subject of subjects) {
		if (!subject.classRoomDepartmentId) continue;
		const list = byClassroom.get(subject.classRoomDepartmentId) ?? [];
		list.push({
			id: subject.id,
			title: subject.subject?.title || "Subject",
			assessments: subject._count?.assessments ?? 0,
		});
		byClassroom.set(subject.classRoomDepartmentId, list);
	}
	return byClassroom;
}

/** Adds `subjects` to each classroom option for the given term. */
export async function withClassroomSubjects<T extends { id: string }>(
	ctx: TRPCContext,
	sessionTermId: string | null,
	classrooms: T[],
	departmentSubjectIds: string[] | null,
) {
	const byClassroom = sessionTermId
		? await getClassroomSubjectOptions(ctx, {
				sessionTermId,
				departmentIds: classrooms.map((classroom) => classroom.id),
				departmentSubjectIds,
			})
		: new Map<string, RecordingSubjectOption[]>();
	return classrooms.map((classroom) => ({
		...classroom,
		subjects: byClassroom.get(classroom.id) ?? [],
	}));
}

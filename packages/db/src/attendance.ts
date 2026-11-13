import type { Database } from "./prisma";
import { getTermRosterExclusions } from "./student-enrollment-eligibility";

export async function getActiveAttendanceRoster({
	activeTermId,
	at,
	db,
	departmentId,
	schoolProfileId,
}: {
	activeTermId: string;
	/** Roster date; withdrawn students leave the roster after their last enrolled day. */
	at?: Date;
	db: Database;
	departmentId: string;
	schoolProfileId: string;
}) {
	const withdrawn = await getTermRosterExclusions(db, {
		schoolId: schoolProfileId,
		termId: activeTermId,
		at,
	});
	return db.studentTermForm.findMany({
		where: {
			...(withdrawn.size ? { studentId: { notIn: [...withdrawn] } } : {}),
			classroomDepartmentId: departmentId,
			deletedAt: null,
			registrationReviewStatus: { not: "REJECTED" },
			schoolProfileId,
			sessionTermId: activeTermId,
			student: {
				deletedAt: null,
			},
		},
		select: {
			id: true,
			schoolProfileId: true,
			sessionTermId: true,
			student: {
				select: {
					id: true,
					name: true,
					otherName: true,
					surname: true,
				},
			},
		},
		orderBy: [
			{
				student: {
					name: "asc",
				},
			},
			{
				student: {
					surname: "asc",
				},
			},
		],
	});
}

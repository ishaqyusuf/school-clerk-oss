import type { Database } from "./prisma";

export async function getActiveAttendanceRoster({
	activeTermId,
	db,
	departmentId,
	schoolProfileId,
}: {
	activeTermId: string;
	db: Database;
	departmentId: string;
	schoolProfileId: string;
}) {
	return db.studentTermForm.findMany({
		where: {
			classroomDepartmentId: departmentId,
			deletedAt: null,
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

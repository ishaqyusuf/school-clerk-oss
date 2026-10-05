import type { Database } from "./prisma";

export async function getDashboardStats(
	db: Database,
	schoolId: string,
	sessionId: string,
) {
	const [students, staff, classes] = await Promise.all([
		db.students.count({
			where: {
				sessionForms: {
					some: {
						schoolSessionId: sessionId,
						schoolSession: { schoolId, deletedAt: null },
						deletedAt: null,
					},
				},
			},
		}),
		db.staffProfile.count({
			where: {
				termProfiles: {
					some: {
						schoolSessionId: sessionId,
						schoolSession: { schoolId, deletedAt: null },
						deletedAt: null,
					},
				},
			},
		}),
		db.classRoomDepartment.count({
			where: {
				classRoom: {
					schoolSessionId: sessionId,
					schoolProfileId: schoolId,
				},
				deletedAt: null,
			},
		}),
	]);
	return { students, staff, classes };
}

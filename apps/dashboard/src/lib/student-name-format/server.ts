import "server-only";

import { prisma } from "@school-clerk/db";
import {
	type StudentNameFormat,
	normalizeStudentNameFormat,
} from "@school-clerk/utils/student-name";

export async function getDashboardStudentNameFormat(
	schoolProfileId: string,
): Promise<StudentNameFormat> {
	const school = await prisma.schoolProfile.findFirst({
		where: {
			id: schoolProfileId,
			deletedAt: null,
		},
		select: {
			studentNameFormat: true,
		},
	});

	return normalizeStudentNameFormat(school?.studentNameFormat);
}

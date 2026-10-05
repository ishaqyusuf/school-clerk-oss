import "server-only";

import { getDashboardSettings } from "@/lib/dashboard-settings";
import {
	type StudentNameFormat,
	normalizeStudentNameFormat,
} from "@school-clerk/utils/student-name";

export async function getDashboardStudentNameFormat(
	schoolProfileId: string,
): Promise<StudentNameFormat> {
	const school = await getDashboardSettings(schoolProfileId);

	return normalizeStudentNameFormat(school?.studentNameFormat);
}

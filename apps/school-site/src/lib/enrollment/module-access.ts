import "server-only";

import { getSchoolModuleConfiguration, prisma } from "@school-clerk/db";
import {
  assertModuleAccess,
  ModuleAccessDeniedError,
  type ModuleId,
} from "@school-clerk/utils/module-config";

// Internal server adapter only. Resolve the school from an existing enrollment
// link/application capability or the resolved public website tenant first;
// never pass an unverified request school ID.
export async function requireEnrollmentModules(
  verifiedSchoolId: string,
  requiredModules: readonly ModuleId[] = ["ADMISSION_ENROLLMENT"],
) {
  const school = await getSchoolModuleConfiguration(prisma, {
    schoolId: verifiedSchoolId,
    platform: true,
  });
  if (!school) {
    throw new ModuleAccessDeniedError("DISABLED", "Enrollment is unavailable.");
  }
  return assertModuleAccess(school.moduleConfiguration, requiredModules);
}

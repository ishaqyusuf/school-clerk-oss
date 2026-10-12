import "server-only";
import { requireDashboardSchoolContext } from "@/lib/module-access";
import { prisma } from "@school-clerk/db";
import type { TRPCContext } from "@api/trpc/init";
export async function assistantRequestContext(): Promise<TRPCContext> {
	const scope = await requireDashboardSchoolContext(["Admin"]);
	const school = await prisma.schoolProfile.findUniqueOrThrow({
		where: { id: scope.profile.schoolId },
		select: { studentNameFormat: true },
	});
	return {
		db: prisma,
		profile: {
			schoolId: scope.profile.schoolId,
			studentNameFormat: school.studentNameFormat,
			sessionId: scope.profile.sessionId,
			termId: scope.profile.termId,
			authSessionId: scope.authSessionId,
		},
		currentUser: scope.user,
	};
}

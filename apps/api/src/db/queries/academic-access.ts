import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

const ACADEMIC_ADMIN_ROLES = new Set(["Admin", "ADMIN"]);

export async function requireAcademicAdmin(ctx: TRPCContext) {
	const user = ctx.currentUser;
	const schoolProfileId = ctx.profile.schoolId;
	if (!user || !schoolProfileId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "A signed-in school administrator is required.",
		});
	}
	if (!user.role || !ACADEMIC_ADMIN_ROLES.has(user.role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only an Admin can manage academic terms.",
		});
	}
	const school = await ctx.db.schoolProfile.findFirst({
		where: {
			id: schoolProfileId,
			accountId: user.saasAccountId ?? "__missing_account__",
			deletedAt: null,
		},
		select: {
			id: true,
			activeSessionTermId: true,
		},
	});
	if (!school) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "The selected school does not belong to your account.",
		});
	}
	return {
		schoolProfileId: school.id,
		activeSessionTermId: school.activeSessionTermId,
		user,
	};
}
